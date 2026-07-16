// Organisk seksjonsskille (2026-konsept): myk asymmetrisk kurve i stedet for
// rette kutt — brukes KUN på /ny. `from` = bakgrunnen bak (forrige seksjon),
// `to` = fyllfargen (neste seksjons bakgrunn).
export default function OrganicDivider({ from = '#fdfcfb', to = '#ffffff', flip = false }: { from?: string; to?: string; flip?: boolean }) {
  return (
    <div aria-hidden className="relative -mb-px" style={{ backgroundColor: from, transform: flip ? 'scaleX(-1)' : undefined }}>
      <svg viewBox="0 0 1440 90" preserveAspectRatio="none" className="block w-full h-[44px] sm:h-[80px]">
        <path d="M0,60 C220,92 470,18 745,32 C1030,46 1240,84 1440,48 L1440,90 L0,90 Z" fill={to} />
      </svg>
    </div>
  );
}
