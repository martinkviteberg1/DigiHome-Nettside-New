import { renderFinnBanners } from './fb-bundle.mjs';
import fs from 'fs';

const opts = {
  headline: 'Ikke selg boligen – lei den ut',
  subtext: 'Gratis leievurdering på 60 sekunder',
  cta: 'Se hva du får',
  eyebrow: 'Utleie i Bergen',
};

for (const theme of ['midnatt', 'krem']) {
  const banners = await renderFinnBanners({ ...opts, theme, formats: ['board', 'netboard', 'hestesko_topp', 'fullskjerm'] });
  for (const b of banners) {
    const buf = Buffer.from(b.dataUrl.split(',')[1], 'base64');
    fs.writeFileSync(`/tmp/fb-${theme}-${b.key}.${b.type === 'jpeg' ? 'jpg' : 'png'}`, buf);
    console.log(theme, b.key, `${b.w}x${b.h}`, Math.round(b.bytes / 1024) + 'kB');
  }
}
console.log('DONE');
