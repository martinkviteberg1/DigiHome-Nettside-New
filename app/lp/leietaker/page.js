import CampaignLandingTenant from '@/components/lp/CampaignLandingTenant';

// Google Ads-kampanjeside for leietakere. noindex (skal ikke konkurrere med
// organiske sider), men crawlbar nok til at annonse-roboter kan lese den.
export const metadata = {
  title: 'Finn ditt neste hjem i Bergen — DigiHome',
  description: 'Kvalitetssikrede utleieboliger i Bergen — uten budrunder og stress. Registrer ønskene dine gratis, så varsler vi deg når den rette boligen blir ledig.',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <CampaignLandingTenant />;
}
