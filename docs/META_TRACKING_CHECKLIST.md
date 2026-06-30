# Meta (Facebook) – sjekkliste for full sporing

Koden er ferdig: Pixel + Conversions API (CAPI) med deduplisering, advanced matching
(hashet e-post/tlf/navn + external_id + geo + fbp/fbc/fbclid + IP/UA), full trakt
(PageView → ViewContent → InitiateCheckout → Lead → Purchase) og GDPR-samtykke-gating.

Disse punktene må gjøres **i Meta Business Manager** (kan ikke gjøres fra koden).
Pixel/datasett-ID: **3249049718587736**

---

## 1) Domeneverifisering av digihome.no
Hvorfor: kreves for iOS-måling (AEM) og for å «eie» konverteringer fra domenet.

1. Business Settings → **Brand Safety → Domains**
2. Legg til `digihome.no` → velg **Meta-tag** eller **DNS TXT**
   - DNS TXT er enklest: legg TXT-posten Meta gir deg hos domeneleverandøren
3. Trykk **Verify** (kan ta noen minutter etter DNS er oppdatert)

## 2) Aggregated Event Measurement (AEM) – prioriterte hendelser (iOS)
Hvorfor: etter iOS 14.5 måles kun de prioriterte hendelsene for ikke-samtykkede iOS-brukere.

1. **Events Manager** → velg datasettet `3249049718587736`
2. Fanen **Aggregated Event Measurement** → **Configure Web Events**
3. Sett prioritert rekkefølge (viktigst øverst):
   1. **Purchase** (signert kunde – høyest verdi)
   2. **Lead** (innsendt skjema)
   3. **InitiateCheckout** (startet skjema)
   4. **ViewContent** (nøkkelside)
   5. **PageView**
4. Lagre. (Verdioptimalisering: la `Purchase` være verdibasert.)

## 3) Bekreft kobling pixel ↔ annonsekonto
1. **Events Manager** → datasett `3249049718587736` → **Settings**
2. Sjekk at riktig **annonsekonto** er tilknyttet datasettet
3. Under **Conversions API**: bekreft at server-hendelser kommer inn (status «Active/Receiving»)

## 4) (Valgfritt) Verifiser live i Test Events før lansering
1. **Events Manager** → datasett → fanen **Test Events** → kopier `TESTxxððð`-koden
2. Be utvikler legge den midlertidig i `.env` som `META_TEST_EVENT_CODE=...` (restart)
3. Utløs en lead på siden → se PageView/ViewContent/InitiateCheckout/Lead i Test Events
4. **Fjern** koden igjen før produksjon (ellers havner ekte hendelser i test-strømmen)

---

## Slik vises hendelsene (forventet)
| Hendelse | Kilde | Når |
|---|---|---|
| PageView | Pixel | Hver side |
| ViewContent | Pixel | Nøkkelsider (forside, bli-utleier, bli-leietaker, forvaltning, /lp/*, /utleie/*) |
| InitiateCheckout | Pixel | Bruker starter et skjema |
| Lead | Pixel + CAPI (deduped) | Skjema sendt inn |
| Purchase | CAPI | Kunde signert (closed-loop, med verdi) |

Match-kvalitet (Event Match Quality) bør bli «Good/Great» pga. hashet e-post/tlf/navn,
external_id, postnummer/land, fbp/fbc/fbclid og IP/UA.

> Merk: All Meta-sporing (pixel + CAPI) respekterer markedsføringssamtykke.
> Brukere som velger «Kun nødvendige» spores ikke.
