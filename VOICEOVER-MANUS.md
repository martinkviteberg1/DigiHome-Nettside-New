# Voiceover-manus — «Utleie på autopilot» (81 sek, 16:9)

Profesjonelt VO-manus tilpasset filmens tidslinje. Generer hver replikk som
**separat MP3-fil** i ElevenLabs (én fil per linje), så plasserer jeg dem
sample-nøyaktig i både web-spilleren og MP4-renderen.

## Anbefalte ElevenLabs-innstillinger
- **Modell:** Eleven Multilingual v2 (best norsk uttale)
- **Stemme:** En rolig, varm og troverdig norsk stemme (mann eller kvinne —
  test gjerne et par i Voice Library med søk «Norwegian»)
- **Stability:** 0.45 · **Similarity:** 0.80 · **Style:** 0.25 · **Speed:** 0.95
- Eksporter som MP3 44,1 kHz

## Replikker med tidsvindu

| # | Filnavn | Starter | Maks lengde | Replikk |
|---|------------|---------|-------------|---------|
| 1 | vo_01.mp3 | 0:01.0 | 4,0 s | «Å leie ut bolig har alltid krevd tid. Mye tid.» |
| 2 | vo_02.mp3 | 0:05.8 | 2,2 s | «Helt til nå.» |
| 3 | vo_03.mp3 | 0:09.6 | 3,8 s | «Ett trykk. Fra nå skjer alt av seg selv.» |
| 4 | vo_04.mp3 | 0:15.5 | 7,0 s | «Boligen styles, annonsen skrives — og alt publiseres. Automatisk.» |
| 5 | vo_05.mp3 | 0:27.0 | 3,5 s | «Visninger booker seg selv.» |
| 6 | vo_06.mp3 | 0:32.8 | 4,5 s | «Hver leietaker screenes grundig — kreditt, inntekt og referanser.» |
| 7 | vo_07.mp3 | 0:39.0 | 3,2 s | «Kontrakten signeres digitalt, med BankID.» |
| 8 | vo_08.mp3 | 0:43.8 | 3,5 s | «Og husleien? Den bare kommer.» |
| 9 | vo_09.mp3 | 0:49.5 | 6,5 s | «Vil du tjene mer? Kombinér langtid og korttid — og lei ut på Airbnb om sommeren.» |
| 10 | vo_10.mp3 | 0:58.5 | 6,0 s | «Lurer leietakeren på noe, får de svar på sekunder. Døgnet rundt.» |
| 11 | vo_11.mp3 | 1:13.3 | 2,4 s | «Trygt. Automagisk.» |
| 12 | vo_12.mp3 | 1:17.3 | 3,0 s | «DigiHome. Utleie på autopilot.» |

## Regi-notater (til generering)
- Tonen er **rolig selvtillit** — ikke «selgende». Tenk Apple/ElevenLabs-fortellerstil.
- Linje 2 («Helt til nå.») skal ha en liten pause-følelse — den lander på
  fargeskiftet i filmen.
- Linje 8: lett smil i stemmen på «Den bare kommer.»
- Linje 9: «Vil du tjene mer?» med et lite løft — dette er mulighets-scenen.
- Linje 11: «Automagisk» uttales som ett naturlig ord — det er filmens signatur.
- Hold replikkene innenfor maks-lengdene, ellers kolliderer de med neste scene.

## Levering
Last opp de 12 MP3-filene her i chatten (eller legg dem i
`/app/public/film/vo/`). Da gjør jeg:
1. Miksing inn i web-spilleren (WebAudio, sample-nøyaktig på tidslinjen)
2. Automatisk «ducking» av musikken under hver replikk (sidechain)
3. Re-rendring av MP4 med stemme + miks
4. Innbrente undertekster blir også mulig (for SoMe-versjonen)

**Alternativ:** Har du en ElevenLabs API-nøkkel, kan jeg generere alle
replikkene automatisk — da slipper du manuell eksport.
