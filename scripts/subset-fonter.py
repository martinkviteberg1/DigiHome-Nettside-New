"""Subsetter nettfontene (woff2) til det nettsiden faktisk bruker: latin, latin-ext (æøå m.m.), typografisk
tegnsetting, €, piler — med kern/tnum/pnum/liga/calt/case/frac. Stilistiske sett (ss01–ss14, salt, aalt) droppes.
Skriver *-sub.woff2 ved siden av originalene; app/fonts.js peker på -sub-filene.
Kjør: python3 scripts/subset-fonter.py   (krever fonttools + brotli)"""
import subprocess, os
os.chdir(os.path.join(os.path.dirname(__file__), '..', 'public', 'fonts'))
uni = "U+0000-00FF,U+0100-017F,U+0218-021B,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2190-21FF,U+2212,U+2215,U+2260,U+2264,U+2265,U+25A0-25FF,U+FB01-FB02"
feats = "kern,tnum,pnum,liga,calt,locl,ccmp,case,frac,numr,dnom,zero,ordn,sups,subs,mark,mkmk"
for f in ['right-grotesk/PPRightGrotesk-Regular.woff2', 'right-grotesk/PPRightGrotesk-Bold.woff2', 'diatype/ABCDiatype-Regular.woff2', 'diatype/ABCDiatype-Medium.woff2']:
    out = f.replace('.woff2', '-sub.woff2')
    subprocess.run(['pyftsubset', f, f'--unicodes={uni}', f'--layout-features={feats}', '--flavor=woff2', f'--output-file={out}', '--no-hinting', '--desubroutinize', '--name-IDs=*', '--notdef-outline'], check=True)
    print(f, os.path.getsize(f), '->', os.path.getsize(out))
