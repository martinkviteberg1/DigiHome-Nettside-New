import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Delt motor for dynamiske Open Graph- / Twitter-bilder (1200×630).
// Designspråk: «Warm Ink Editorial» — rolig, høy-end, redaksjonell.
// Brukes av app/opengraph-image.js, app/twitter-image.js og per-side-overstyringer.
// ---------------------------------------------------------------------------

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';
export const OG_ALT = 'DigiHome — smartere eiendomsforvaltning i Bergen';

// Merkefonter (lisensierte). Satori leser .woff direkte. Caches mellom kall.
let _fontsPromise = null;
async function loadFonts() {
  if (_fontsPromise) return _fontsPromise;
  const dir = path.join(process.cwd(), 'public', 'fonts');
  _fontsPromise = (async () => {
    const [grBold, grReg, diaReg, diaMed] = await Promise.all([
      readFile(path.join(dir, 'right-grotesk', 'PPRightGrotesk-Bold.woff')),
      readFile(path.join(dir, 'right-grotesk', 'PPRightGrotesk-Regular.woff')),
      readFile(path.join(dir, 'diatype', 'ABCDiatype-Regular.woff')),
      readFile(path.join(dir, 'diatype', 'ABCDiatype-Medium.woff')),
    ]);
    return [
      { name: 'RightGrotesk', data: grReg, weight: 400, style: 'normal' },
      { name: 'RightGrotesk', data: grBold, weight: 700, style: 'normal' },
      { name: 'Diatype', data: diaReg, weight: 400, style: 'normal' },
      { name: 'Diatype', data: diaMed, weight: 500, style: 'normal' },
    ];
  })();
  return _fontsPromise;
}

const INK = '#0A0A0A';
const QUIET = '#7C7466';
const TAUPE = '#9B9080';
const CANVAS = '#FDFCFB';
const HAIRLINE = '#EBE6DF';
const LAVENDER = '#9B5BD6';

function titleSize(t) {
  const len = (t || '').length;
  if (len > 58) return 48;
  if (len > 44) return 56;
  if (len > 30) return 64;
  return 74;
}

/**
 * Render et merket OG-bilde.
 * @param {{eyebrow?:string, title:string, subtitle?:string, chips?:string[]|null}} opts
 */
export async function renderOg({ eyebrow, title, subtitle, chips } = {}) {
  let fonts = [];
  try {
    fonts = await loadFonts();
  } catch (e) {
    fonts = [];
  }
  const chipList =
    chips === null
      ? []
      : chips && chips.length
      ? chips
      : ['30+ Eiendommer', '98% Tilfredshet', '+30% Inntekt'];

  const tSize = titleSize(title);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          padding: '72px',
          backgroundColor: CANVAS,
          color: INK,
          fontFamily: 'Diatype',
          overflow: 'hidden',
        }}
      >
        {/* Prikk-grid-tekstur */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            backgroundImage: 'radial-gradient(#E7E1D8 1.3px, transparent 1.3px)',
            backgroundSize: '34px 34px',
            opacity: 0.5,
          }}
        />
        {/* Myk lavendel-glød */}
        <div
          style={{
            position: 'absolute',
            top: '-260px',
            right: '-150px',
            width: '700px',
            height: '700px',
            display: 'flex',
            borderRadius: '9999px',
            background:
              'radial-gradient(circle at center, rgba(207,151,252,0.45) 0%, rgba(207,151,252,0) 68%)',
          }}
        />

        {/* Toppstripe: wordmark + URL */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                fontFamily: 'RightGrotesk',
                fontWeight: 700,
                fontSize: '34px',
                letterSpacing: '-0.02em',
                color: INK,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              DigiHome
            </div>
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '9999px',
                backgroundColor: LAVENDER,
                marginLeft: '7px',
                marginTop: '14px',
                display: 'flex',
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '20px',
              color: QUIET,
              letterSpacing: '0.04em',
            }}
          >
            digihome.no
          </div>
        </div>

        {/* Innholdsblokk nederst */}
        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {eyebrow ? (
            <div
              style={{
                display: 'flex',
                fontSize: '21px',
                fontWeight: 500,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: TAUPE,
                marginBottom: '22px',
              }}
            >
              {eyebrow}
            </div>
          ) : null}

          <div
            style={{
              display: 'flex',
              fontFamily: 'RightGrotesk',
              fontWeight: 700,
              fontSize: `${tSize}px`,
              lineHeight: 1.04,
              letterSpacing: '-0.03em',
              color: INK,
              maxWidth: '1000px',
            }}
          >
            {title}
          </div>

          {subtitle ? (
            <div
              style={{
                display: 'flex',
                fontSize: '27px',
                lineHeight: 1.4,
                color: QUIET,
                marginTop: '24px',
                maxWidth: '900px',
              }}
            >
              {subtitle}
            </div>
          ) : null}

          {chipList.length ? (
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '46px' }}>
              {chipList.map((c, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '11px 20px',
                    marginRight: '14px',
                    borderRadius: '9999px',
                    backgroundColor: '#FFFFFF',
                    border: `1px solid ${HAIRLINE}`,
                    color: '#1A1A1A',
                    fontSize: '20px',
                    fontWeight: 500,
                  }}
                >
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '9999px',
                      backgroundColor: LAVENDER,
                      marginRight: '10px',
                      display: 'flex',
                    }}
                  />
                  {c}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts }
  );
}
