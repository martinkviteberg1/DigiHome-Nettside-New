import ForsideV4 from '@/components/forside/v4/ForsideV4';

export const metadata = {
  title: 'DigiHome — Utleie på autopilot (v4)',
  description: 'Fra leietaker og kontrakt til husleie, drift og leverandører. DigiHome samler hele utleien — og gjør arbeidet underveis.',
  robots: { index: false, follow: false },
};

export default function V4Page() {
  return <ForsideV4 />;
}
