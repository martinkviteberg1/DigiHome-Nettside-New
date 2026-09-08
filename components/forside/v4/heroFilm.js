/* Heroens film — delt modul UTEN 'use client', så både klientkomponentene (HeroStage/ForsideV4) og server-
   komponenten app/page.js (preload av LCP-bildet) leser samme verdier. Se HeroStage.js for historien. */
export const FILM = {
  loop: '/v4/video/eier-1920.mp4',
  loopSmal: '/v4/video/eier-1280.mp4',
  /* VP9-kopi for nettlesere uten H.264 (enkelte Linux-Firefox/Chromium-bygg). */
  loopWebm: '/v4/video/eier-1280.webm',
  poster: '/v4/video/eier-poster.webp',
  posterSmal: '/v4/video/eier-poster-mobil.webp',
  hjem: '/v4/video/eier-hjemme-1920.webp',
  hjemSmal: '/v4/video/eier-hjemme-mobil.webp',
  /* Sluttbildet lever: han i sofaen, kvelden er hans. Sømløs 14 s loop (scripts/lag-hjemme-loop.py) — H.264 1920/1280,
     VP9 som reserve, første bilde som poster. Stillbildene over brukes ved redusert bevegelse. */
  hjemVideo: '/v4/video/eier-hjemme-loop-1920.mp4?v=2',
  hjemVideoSmal: '/v4/video/eier-hjemme-loop-1280.mp4?v=2',
  hjemVideoWebm: '/v4/video/eier-hjemme-loop-1280.webm?v=2',
  hjemPoster: '/v4/video/eier-hjemme-loop-poster.webp?v=2',
  /* Smal skjerm: samme bilde beskåret til båndet som faktisk vises (x 288–1248 av 1920, object-position 30 %) —
     43 KB i stedet for 108, og LCP-bildet er skarpt der det teller. Matematikken: a = X·(W − c) med X = 0.30. */
  hjemPosterSmal: '/v4/video/eier-hjemme-loop-poster-mobil.webp',
  /* direkte: heroen åpner rett i sofaen — ingen gåtur, ingen panelhistorie. Loopen er scenen fra første bilde;
     tekst og feeden fra mobilen kommer inn i rolig rekkefølge. (Din adresse → Street View-flyten er som før.) */
  direkte: true,
  /* Sekundet der han fortsatt leser — rett før telefonen går i lommen. Har du ikke trykket, trykker historien her. */
  trykkVed: 7.4,
  /* Filmen er 12,04 s og slutter med ham på trappen foran døren. Dissolven til stua starter `hjemVed` — så sent at
     hele gangen inn til døren spilles ferdig, og de siste bildene (han står ved døren) ligger under overgangen.
     Timeren settes presist fra filmens klokke (ikke bare timeupdate, som tikker hvert ~250 ms). Filmen selv rører
     vi aldri (ingen transform/zoom på video-elementet). `ended` er reserve. */
  hjemVed: 11.9,
  once: true,
};
