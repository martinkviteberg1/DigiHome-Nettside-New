# Closed-loop: patch for DigiHome-plattformen (det andre repoet)

> **Mål:** Når en markedsførings-lead blir **vunnet** (`signed`) eller **tapt**
> (`lost`/`disqualified`) i plattformens salgs-pipeline, skal plattformen
> varsle markedssiden slik at **Meta CAPI «Purchase»** + **Google offline-
> konvertering** fyrer automatisk (lukket sløyfe → korrekt ROAS/CPA).
>
> Markedssidens mottaker (`POST /api/webhooks/lead-status`) er **allerede ferdig**
> og venter. Det eneste som mangler er at plattformen (1) **lagrer** `external_ref`
> + `source_system`, og (2) **kaller** webhooken ved statusendring.
>
> Gi denne fila til Emergent-agenten i plattform-prosjektet, eller bruk den som
> en presis oppskrift.

---

## 0) Miljøvariabler (backend `.env` på plattformen)

```env
# URL til markedssidens webhook (bruk markedssidens PROD-domene):
MARKETING_WEBHOOK_URL=https://<MARKEDSSIDENS_PROD_DOMENE>/api/webhooks/lead-status
# Samme hemmelighet som markedssidens .env (LEAD_SYNC_SECRET). Kopier eksakt verdi derfra.
LEAD_SYNC_SECRET=<SAMME_VERDI_SOM_PÅ_MARKEDSSIDEN>
```

> NB: `LEAD_SYNC_SECRET` **må være identisk** med verdien i markedssidens `.env`,
> ellers svarer mottakeren `401 Uautorisert`.

---

## 1) `backend/routes/tasks.py` — lagre `external_ref` + `source_system`

### 1a) I `create_lead` (POST `/api/leads`)
Legg til to felt i `lead`-dicten rett før `leads_col.insert_one(lead)`:

```python
    lead = {
        "id": lead_id,
        "tenant_id": default_tid,
        "name": body.get("name", ""),
        # ... eksisterende felt uendret ...
        "status": "new",
        "language": (body.get("language") or "no"),
        "created_at": now(),
        # ── NYTT: closed-loop-kobling til markedssiden ──
        "external_ref": (body.get("external_ref") or "").strip(),
        "source_system": (body.get("source_system") or "").strip(),
    }
```

### 1b) I `create_tenant` (POST `/api/tenants`)
Gjør nøyaktig det samme i tenant-dokumentet (samme to felt) før `tenant_leads_col.insert_one(...)`.

---

## 2) `backend/routes/tasks.py` — utgående webhook ved statusendring

### 2a) Legg til hjelpefunksjon (øverst i fila, etter imports)

```python
import os
import threading
from datetime import datetime, timezone
import requests  # finnes allerede i requirements.txt

MARKETING_WEBHOOK_URL = os.environ.get("MARKETING_WEBHOOK_URL", "")
LEAD_SYNC_SECRET = os.environ.get("LEAD_SYNC_SECRET", "")

# Hvilke marketing-kilder vi sender closed-loop for:
_MARKETING_SOURCES = {"digihome-marketing", "digihome-marketing-leadads"}


def notify_marketing_lead_status(doc: dict, marketing_status: str,
                                 value: float | None = None, currency: str = "NOK"):
    """Best-effort closed-loop: varsle markedssiden (digihome.no) når en
    markedsførings-lead blir vunnet/tapt. Kjører i egen tråd – blokkerer
    ALDRI pipeline-oppdateringen, og feiler stille."""
    if not MARKETING_WEBHOOK_URL or not LEAD_SYNC_SECRET:
        return
    if (doc or {}).get("source_system") not in _MARKETING_SOURCES:
        return  # kun leads som faktisk kom fra markedssiden
    payload = {
        "external_ref": doc.get("external_ref") or "",
        "source_system": doc.get("source_system") or "",
        "status": marketing_status,                 # 'won' | 'lost'
        "email": doc.get("email") or "",
        "phone": doc.get("phone") or "",
        "changed_at": datetime.now(timezone.utc).isoformat(),
    }
    if value and float(value) > 0:
        payload["value"] = round(float(value), 2)
        payload["currency"] = currency

    def _send():
        try:
            requests.post(
                MARKETING_WEBHOOK_URL,
                json=payload,
                headers={"x-webhook-secret": LEAD_SYNC_SECRET,
                         "Content-Type": "application/json"},
                timeout=6,
            )
        except Exception:
            pass

    threading.Thread(target=_send, daemon=True).start()
```

### 2b) Hekt den på i `_transition_lead(...)`
Rett etter `col.update_one({"id": lead_id}, ops)` (linje ~1080), legg til:

```python
    # ── Closed-loop til markedssiden (kun marketing-leads) ──
    try:
        _ML = {"signed": "won", "lost": "lost", "disqualified": "lost", "rejected": "lost"}
        m = _ML.get(new_status)
        if m:
            won_value = None
            if m == "won":
                # Plugg inn FAKTISK kontraktsverdi her hvis tilgjengelig
                # (f.eks. fra signert tilbud / forvaltningsavtale). Faller
                # ellers tilbake til markedssidens default-verdi.
                won_value = ((extra or {}).get("won_value")
                             or doc.get("won_value")
                             or doc.get("estimated_value"))
            notify_marketing_lead_status(doc, m, value=won_value)
    except Exception:
        pass
```

> **Hvorfor `_transition_lead`?** Den er den sentrale stegovergangs-funksjonen
> som både `update_lead_status` (PUT `/api/sales/lead/{id}`) og `close_lead`
> (POST `/api/sales/lead/{id}/close`) går gjennom. Ett hekt-punkt dekker alt.
>
> **Hvis `close_lead` IKKE går via `_transition_lead`** i din versjon: legg det
> samme `notify_marketing_lead_status(doc, "lost", ...)`-kallet inn der også,
> rett etter at status settes til `lost`/`disqualified`.

---

## 3) Verdi-håndtering (ROAS) — dual-value (best practice)

To verdier holdes adskilt:

- **Akkvisisjonsverdi** (sendes til Google/Meta for budgivning): settes ÉN gang
  ved `signed` med **estimert årlig honorar** (basert på estimert leie). Fyres da
  fordi attribusjonsvinduet krever det. Fryses etterpå.
- **Faktisk verdi** (intern sann ROAS): når faktisk leiekontrakt signeres og
  reelt honorar er kjent, send et nytt webhook-kall med `value_update: true` og
  den faktiske verdien. Markedssiden oppdaterer da intern `wonValue`
  (dashbordet) uten å dobbelt-fyre konverteringer.

```python
# Ved signering (estimat):
notify_marketing_lead_status(doc, "won", value=estimert_aarlig_honorar)

# Senere, når leiekontrakt er signert (faktisk honorar):
# legg "value_update": True i payloaden (egen liten variant av helperen):
#   payload = {"external_ref": ..., "status": "won",
#              "value": faktisk_aarlig_honorar, "value_update": True}
```

- Sender plattformen ingen `value` → markedssiden bruker
  `GOOGLE_ADS_DEFAULT_LEAD_VALUE` (i dag `0`) → verdibasert ROAS blir 0.
- **Senere leiekontrakt-endringer:** ikke jag hver endring mot ad-plattformene
  (vinduer lukkes). Hold akkvisisjonsverdien frosset; bruk `value_update` kun
  første gang faktisk honorar er kjent. Intern LTV kan du oppdatere fritt.


---

## 4) Webhook-kontrakt (referanse — markedssidens mottaker)

`POST {MARKETING_WEBHOOK_URL}`
Header: `x-webhook-secret: <LEAD_SYNC_SECRET>`

```jsonc
{
  "external_ref": "<plattformens lagrede external_ref = markedssidens lead.id>",
  "source_system": "digihome-marketing",
  "status": "won",            // 'won' | 'lost' (også 'signed'/'lost'/'avvist' mappes)
  "value": 12000,              // valgfritt – kontraktsverdi
  "currency": "NOK",          // valgfritt
  "email": "kunde@epost.no",  // fallback-matching
  "phone": "+47 999 99 999",  // fallback-matching (siste 8 siffer)
  "changed_at": "2026-02-10T10:00:00Z"
}
```

Matching på markedssiden: `external_ref` → `platform_id` → `email` → `telefon`.
Idempotent: CAPI/Google fyrer kun én gang per vunnet lead.

---

## 5) Verifisering

1. Sett env, redeploy plattformen.
2. Opprett en testlead via markedssidens `/bli-utleier` (gir `external_ref`).
3. I plattformen: flytt leaden til `signed`.
4. Sjekk markedssidens admin → leaden skal stå som **Vunnet**, og
   `metaCapiWon.ok` / `googleAdsWon.ok` skal være `true` (hvis gclid/fbclid finnes).
