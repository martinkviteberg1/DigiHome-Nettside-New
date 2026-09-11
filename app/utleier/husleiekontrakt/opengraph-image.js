import { renderOgV4, OG_V4_SIZE } from '@/lib/og-v4';

export const alt = 'Gratis husleiekontrakt med BankID-signering — DigiHome';
export const size = OG_V4_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return renderOgV4({
    tittel: ['Gratis', 'husleiekontrakt'],
    under: 'Lag en juridisk gyldig leiekontrakt gratis. Søk opp boligen, se kontrakten ta form, og signer med BankID.',
    str: 92,
  });
}
