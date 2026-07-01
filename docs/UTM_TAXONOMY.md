# UTM-taksonomi & attribusjon — DigiHome

Konsekvent UTM-navngiving er avgjørende for ren attribusjon (paid vs. organic,
kampanje-nivå ROAS, closed-loop). Bruk **alltid** disse feltene på annonse-URL-er.
Alt lagres på leadet (`attribution`) og videresendes til plattformen.

## Feltene

| UTM-parameter | Regel | Eksempler |
|---|---|---|
| `utm_source` | Plattform/nettverk (lowercase) | `google`, `facebook`, `instagram`, `bing`, `newsletter`, `finn` |
| `utm_medium` | Kanaltype — **styrer betalt/organisk** | `cpc`, `ppc`, `paid_social`, `display`, `email`, `organic`, `referral`, `social` |
| `utm_campaign` | Kampanjenavn (kebab-case) | `utleier-forvaltning-q1`, `leietaker-bergen-alltid`, `arvet-bolig-retargeting` |
| `utm_term` | Søkeord/målgruppe | `eiendomsforvaltning-bergen`, `lookalike-huseiere` |
| `utm_content` | Annonse-/variant-id | `ad-a-hero`, `carousel-v2`, `rsa-3` |

> **Betalt-signal:** `deriveChannel()` merker `channel = "Betalt"` når `medium ∈ {cpc, ppc, paid, paidsearch, paid_social, display}` **eller** `source ∈ {google_ads, facebook_ads}`. I tillegg settes `is_paid = true` automatisk hvis en betalt klikk-ID finnes (`gclid`/`gbraid`/`wbraid`/`msclkid`). Google/Meta legger disse på automatisk ved auto-tagging — **ikke fjern dem**.

## Konvensjon pr. kanal

**Google Ads (Search):**
```
?utm_source=google&utm_medium=cpc&utm_campaign=<kampanje>&utm_term={keyword}&utm_content={creative}
```
(La Google auto-tagging være PÅ → `gclid` følger med automatisk. Ikke overstyr `gclid`.)

**Meta (Facebook/Instagram):**
```
?utm_source=facebook&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}
```
(Meta legger på `fbclid` automatisk. Pixelen setter `_fbp`/`_fbc` → brukes i CAPI-matching.)

**E-post (nyhetsbrev):**
```
?utm_source=newsletter&utm_medium=email&utm_campaign=<utsendelse>
```

## Landingssider (message-match)

Alle kampanjesider ligger på `/lp/<slug>` (noindex). Leads herfra merkes `source: lp-<slug>`.

| Slug | Vinkel | Målgruppe |
|---|---|---|
| `/lp/forvaltning` | Full forvaltning | Huseier |
| `/lp/inntekt` | +30 % leieinntekt | Huseier |
| `/lp/10pluss2` | 10+2-hybridmodell | Huseier |
| `/lp/arvet-bolig` | Arvet/tom bolig | Huseier (arv) |
| `/lp/airbnb-langtid` | Fra Airbnb → trygg inntekt | Airbnb-verter |
| `/lp/leietaker` | Finn bolig i Bergen | Leietaker |

**Regel:** hver annonsegruppe → matchende LP + matchende `utm_campaign`. Send alltid betalt trafikk til `/lp/*` (ikke forsiden) for ren attribusjon og høyere konvertering.

## Closed-loop-felter (sendes til plattformen)

Hvert videresendt lead inneholder nå:
- `external_ref` — vår lead-id (nøkkel for won-webhook tilbake)
- `source_system: "digihome-marketing"`
- `lead_source_type` — `paid` | `paid_social` | `organic` | `social` | `email` | `referral` | `direct` | `manual`
- `is_paid` — boolean
- `marketing_visitor_id` — vår førsteparts visitor-id (for cross-system stitching)
- `attribution` — hele objektet (utm_*, gclid/gbraid/wbraid, fbclid, fbp/fbc, msclkid, ga_client_id, channel, referrer, landing_page)

Ved **won** fyrer vi automatisk: Meta CAPI `Purchase`, Google Ads offline-konvertering (m/ gclid) og GA4 Measurement Protocol `purchase` — alle samtykke-gated (`dh_consent_mkt`).
