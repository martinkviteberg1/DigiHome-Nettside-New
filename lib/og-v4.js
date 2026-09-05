import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

/* ---------------------------------------------------------------------------
   OG-bilde for V4 (1200×630) — «Utleie på autopilot.»
   Samme språk som siden: canvas, ekte logo, PP Right Grotesk, Diatype,
   lilla kun på punktum og handling. Ingen glød, ingen sperrede eyebrows,
   ingen tall som ikke er publisert. Til høyre: godkjenningskortet fra heroen
   (det ene du gjør) — så forhåndsvisningen forteller hva produktet er.
--------------------------------------------------------------------------- */

export const OG_V4_SIZE = { width: 1200, height: 630 };
export const OG_V4_ALT = 'DigiHome — Utleie på autopilot. Én godkjenning, resten gjør DigiHome.';

const CANVAS = '#F3F1EC';
const INK = '#15130F';
const CHARCOAL = '#221F1A';
const OFF = '#F4F1EA';
const LILLA = '#D496FF';

let _assets = null;
async function loadAssets() {
  if (_assets) return _assets;
  const pub = path.join(process.cwd(), 'public');
  _assets = (async () => {
    const [grBold, diaReg, diaMed, logo] = await Promise.all([
      readFile(path.join(pub, 'fonts', 'right-grotesk', 'PPRightGrotesk-Bold.woff')),
      readFile(path.join(pub, 'fonts', 'diatype', 'ABCDiatype-Regular.woff')),
      readFile(path.join(pub, 'fonts', 'diatype', 'ABCDiatype-Medium.woff')),
      readFile(path.join(pub, 'digihome-hero-logo.svg'), 'utf8'),
    ]);
    return {
      fonts: [
        { name: 'RightGrotesk', data: grBold, weight: 700, style: 'normal' },
        { name: 'Diatype', data: diaReg, weight: 400, style: 'normal' },
        { name: 'Diatype', data: diaMed, weight: 500, style: 'normal' },
      ],
      logo: `data:image/svg+xml;base64,${Buffer.from(logo).toString('base64')}`,
    };
  })();
  return _assets;
}

export async function renderOgV4({ tittel = ['Utleie på', 'autopilot'], under = 'Kontrakt, husleie og saker går av seg selv. Du godkjenner det som koster.', host = 'digihome.no', str = 104 } = {}) {
  let fonts = [];
  let logo = null;
  try {
    const a = await loadAssets();
    fonts = a.fonts;
    logo = a.logo;
  } catch (e) {
    fonts = [];
  }

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', padding: '64px 72px', backgroundColor: CANVAS, color: INK, fontFamily: 'Diatype' }}>
        {/* Topp: logo + host */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} width={150} height={36} alt="" style={{ width: 150, height: 36 }} />
          ) : (
            <div style={{ fontFamily: 'RightGrotesk', fontWeight: 700, fontSize: 32, letterSpacing: '-0.02em', display: 'flex' }}>digihome</div>
          )}
          <div style={{ fontSize: 22, color: 'rgba(21,19,15,0.5)', display: 'flex' }}>{host}</div>
        </div>

        {/* Midt: statement til venstre, godkjenningskort til høyre */}
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'space-between', marginTop: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', width: 640 }}>
            <div style={{ display: 'flex', flexDirection: 'column', fontFamily: 'RightGrotesk', fontWeight: 700, fontSize: str, lineHeight: 0.94, letterSpacing: '-0.035em', color: INK }}>
              <div style={{ display: 'flex' }}>{tittel[0]}</div>
              <div style={{ display: 'flex' }}>{tittel[1]}<span style={{ color: LILLA }}>.</span></div>
            </div>
            <div style={{ display: 'flex', marginTop: 30, fontSize: 28, lineHeight: 1.35, color: 'rgba(21,19,15,0.64)', maxWidth: 600 }}>{under}</div>
          </div>

          {/* Kortet — det ene du gjør */}
          <div style={{ display: 'flex', flexDirection: 'column', width: 356, padding: 26, borderRadius: 20, backgroundColor: CHARCOAL, color: OFF, boxShadow: '0 30px 60px -30px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 16, color: 'rgba(244,241,234,0.62)' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: LILLA, marginRight: 10, display: 'flex' }} />
                <div style={{ display: 'flex' }}>Venter på deg</div>
              </div>
              <div style={{ display: 'flex' }}>22:43</div>
            </div>
            <div style={{ display: 'flex', marginTop: 18, fontSize: 21, fontWeight: 500 }}>Rørlegger AS · torsdag 09:00</div>
            <div style={{ display: 'flex', marginTop: 6, fontSize: 16, color: 'rgba(244,241,234,0.62)' }}>Bygårdens faste rørlegger · varmtvann, Leilighet 2</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 }}>
              <div style={{ display: 'flex', fontFamily: 'RightGrotesk', fontWeight: 700, fontSize: 30, letterSpacing: '-0.02em' }}>3 450 kr</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 44, padding: '0 20px', borderRadius: 12, backgroundColor: LILLA, color: INK, fontSize: 17, fontWeight: 500 }}>Godkjenn</div>
            </div>
          </div>
        </div>

        {/* Bunn: én linje */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 18, color: 'rgba(21,19,15,0.5)', paddingTop: 20, borderTop: '1px solid rgba(21,19,15,0.10)' }}>
          <div style={{ display: 'flex' }}>Én godkjenning. Resten gjorde DigiHome.</div>
          <div style={{ display: 'flex' }}>For private · eiendomsselskap · forvaltning</div>
        </div>
      </div>
    ),
    { ...OG_V4_SIZE, fonts }
  );
}

/* ---------------------------------------------------------------------------
   Forside-variant (1200×630) — lys, editorial. Skarpt eksteriør (hvit bygård, himmel)
   øverst; nederste halvdel glir over i canvas der «Utleie på autopilot.» står i
   PP Right Grotesk, én linje under, hårlinje, logo + vert. Ingen kort, ingen glød –
   bare eiendom og setning. Renderes én gang til /public/og/forside.jpg.
   `kilde` = absolutt sti til 1200×630 JPG (Satori leser ikke webp).
--------------------------------------------------------------------------- */
export async function renderOgForside({ kilde, tittel = ['Utleie på', 'autopilot'], under = 'Kontrakt, husleie og saker går av seg selv – du godkjenner det som koster.', host = 'digihome.no' } = {}) {
  let fonts = [];
  let logo = null;
  let bilde = null;
  try {
    const a = await loadAssets();
    fonts = a.fonts;
    logo = a.logo;
    if (kilde) bilde = `data:image/jpeg;base64,${(await readFile(kilde)).toString('base64')}`;
  } catch (e) {
    fonts = fonts || [];
  }

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', backgroundColor: CANVAS, color: INK, fontFamily: 'Diatype' }}>
        {bilde ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bilde} width={1200} height={630} alt="" style={{ position: 'absolute', top: 0, left: 0, width: 1200, height: 630, objectFit: 'cover' }} />
        ) : null}
        {/* Slør: foto øverst → canvas nederst */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 1200, height: 630, display: 'flex', backgroundImage: 'linear-gradient(180deg, rgba(243,241,236,0) 0%, rgba(243,241,236,0) 27%, rgba(243,241,236,0.6) 43%, rgba(243,241,236,0.96) 57%, rgba(243,241,236,1) 100%)' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, width: 1200, height: 630, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 72px 46px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', fontFamily: 'RightGrotesk', fontWeight: 700, fontSize: 104, lineHeight: 0.92, letterSpacing: '-0.035em', color: INK }}>
            <div style={{ display: 'flex' }}>{tittel[0]}</div>
            <div style={{ display: 'flex' }}>{tittel[1]}<span style={{ color: LILLA }}>.</span></div>
          </div>
          <div style={{ display: 'flex', marginTop: 20, fontSize: 26, lineHeight: 1.3, color: 'rgba(21,19,15,0.66)', maxWidth: 980 }}>{under}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 30, paddingTop: 20, borderTop: '1px solid rgba(21,19,15,0.12)' }}>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} width={142} height={34} alt="" style={{ width: 142, height: 34 }} />
            ) : (
              <div style={{ fontFamily: 'RightGrotesk', fontWeight: 700, fontSize: 30, letterSpacing: '-0.02em', display: 'flex' }}>digihome</div>
            )}
            <div style={{ display: 'flex', fontSize: 20, color: 'rgba(21,19,15,0.5)' }}>{host}</div>
          </div>
        </div>
      </div>
    ),
    { ...OG_V4_SIZE, fonts }
  );
}

/* ---------------------------------------------------------------------------
   Foto-variant (1200×630): eieren utenfor boligen om kvelden — filmens første bilde —
   med hvit logo, «Utleie på autopilot.» og én linje. Renderes én gang til /public/og/*.jpg
   (statisk fil = lynrask og pålitelig for iMessage/Slack/LinkedIn, ingen kaldstart).
--------------------------------------------------------------------------- */
export async function renderOgFoto({ foto = 'v4/video/eier-poster.webp', tittel = ['Utleie på', 'autopilot'], under = 'Én godkjenning. Resten gjorde DigiHome.', host = 'digihome.no' } = {}) {
  let fonts = [];
  let logoHvit = null;
  let bilde = null;
  try {
    const a = await loadAssets();
    fonts = a.fonts;
    const pub = path.join(process.cwd(), 'public');
    const [svg, jpg] = await Promise.all([
      readFile(path.join(pub, 'digihome-hero-logo-white.svg'), 'utf8'),
      /* Satori leser ikke webp → PNG/JPG-kopi må finnes ved siden av (lages av scripts/og-foto). */
      readFile(path.join(pub, foto.replace(/\.webp$/, '.jpg'))),
    ]);
    logoHvit = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    bilde = `data:image/jpeg;base64,${jpg.toString('base64')}`;
  } catch (e) {
    fonts = fonts || [];
  }

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', backgroundColor: CHARCOAL, color: OFF, fontFamily: 'Diatype' }}>
        {bilde ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bilde} width={1200} height={630} alt="" style={{ position: 'absolute', top: 0, left: 0, width: 1200, height: 630, objectFit: 'cover', objectPosition: '50% 40%' }} />
        ) : null}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 1200, height: 630, display: 'flex', backgroundImage: 'linear-gradient(180deg, rgba(21,18,15,0.30) 0%, rgba(21,18,15,0.08) 32%, rgba(21,18,15,0.62) 66%, rgba(21,18,15,0.90) 100%)' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, width: 1200, height: 630, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '56px 72px 58px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {logoHvit ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoHvit} width={150} height={36} alt="" style={{ width: 150, height: 36 }} />
            ) : (
              <div style={{ fontFamily: 'RightGrotesk', fontWeight: 700, fontSize: 32, letterSpacing: '-0.02em', display: 'flex' }}>digihome</div>
            )}
            <div style={{ fontSize: 22, color: 'rgba(244,241,234,0.7)', display: 'flex' }}>{host}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', flexDirection: 'column', fontFamily: 'RightGrotesk', fontWeight: 700, fontSize: 100, lineHeight: 0.92, letterSpacing: '-0.035em', color: OFF }}>
              <div style={{ display: 'flex' }}>{tittel[0]}</div>
              <div style={{ display: 'flex' }}>{tittel[1]}<span style={{ color: LILLA }}>.</span></div>
            </div>
            <div style={{ display: 'flex', marginTop: 22, fontSize: 27, lineHeight: 1.3, color: 'rgba(244,241,234,0.8)' }}>{under}</div>
          </div>
        </div>
      </div>
    ),
    { ...OG_V4_SIZE, fonts }
  );
}
