import sharp from 'sharp';
const svg = `<svg width="320" height="250" xmlns="http://www.w3.org/2000/svg">
<defs><radialGradient id="g" cx="90%" cy="10%" r="80%"><stop offset="0%" stop-color="#cf97fc" stop-opacity="0.35"/><stop offset="100%" stop-color="#cf97fc" stop-opacity="0"/></radialGradient></defs>
<rect width="320" height="250" fill="#0a0a0a"/>
<rect width="320" height="250" fill="url(#g)"/>
<circle cx="26" cy="30" r="5" fill="#cf97fc"/>
<text x="38" y="35" font-family="Liberation Sans, FreeSans, sans-serif" font-size="14" font-weight="bold" fill="#ffffff">DigiHome</text>
<text x="24" y="90" font-family="Liberation Sans, FreeSans, sans-serif" font-size="23" font-weight="bold" fill="#ffffff">Ikke selg boligen –</text>
<text x="24" y="118" font-family="Liberation Sans, FreeSans, sans-serif" font-size="23" font-weight="bold" fill="#cf97fc">lei den ut i stedet</text>
<text x="24" y="148" font-family="Liberation Sans, FreeSans, sans-serif" font-size="13" fill="#d6d6d6">Gratis leievurdering på 60 sekunder</text>
<rect x="24" y="184" rx="18" width="152" height="36" fill="#ffffff"/>
<text x="100" y="207" font-family="Liberation Sans, FreeSans, sans-serif" font-size="13" font-weight="bold" fill="#0a0a0a" text-anchor="middle">Se hva du får</text>
</svg>`;
const buf = await sharp(Buffer.from(svg), { density: 144 }).png().toBuffer();
console.log('PNG bytes:', buf.length);
await sharp(Buffer.from(svg)).png().toFile('/tmp/banner-test.png');
console.log('OK');
