// Verifiser Runde 2-tilstanden live: final URL-suffiks + alle utvidelser m/ innhold.
import fs from 'fs';
const env = fs.readFileSync('/app/.env', 'utf8');
for (const l of env.split('\n')) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
const lib = await import('/app/lib/google-ads-native.js');

const CAMP_NAME = 'DH | Utleie | Bergen | Search';
const CUST = lib.defaultCustomerId();

(async () => {
  const camp = await lib.getCampaignByName(CUST, CAMP_NAME);
  if (!camp) { console.log('FANT IKKE kampanjen'); return; }
  console.log('Kampanje:', camp.name, '(', camp.id, ')');

  // Final URL-suffiks
  const suffix = await lib.getCampaignFinalUrlSuffix(CUST, camp.id);
  console.log('\nFinal URL-suffiks:\n ', suffix || '(ingen)');

  // Alle utvidelser m/ innhold
  const q = `
    SELECT campaign.id, campaign_asset.field_type, asset.type,
           asset.sitelink_asset.link_text, asset.sitelink_asset.description1, asset.sitelink_asset.description2,
           asset.final_urls,
           asset.callout_asset.callout_text,
           asset.structured_snippet_asset.header, asset.structured_snippet_asset.values
    FROM campaign_asset
    WHERE campaign.id = ${camp.id} AND campaign_asset.status != 'REMOVED'
    ORDER BY campaign_asset.field_type`;
  const rows = await lib.gaqlSearch(CUST, q);

  const sitelinks = [], callouts = [], snippets = [], other = [];
  for (const r of rows) {
    const ft = r.campaignAsset?.fieldType;
    const a = r.asset || {};
    if (ft === 'SITELINK') sitelinks.push(`${a.sitelinkAsset?.linkText} — ${a.sitelinkAsset?.description1 || ''} / ${a.sitelinkAsset?.description2 || ''} → ${(a.finalUrls || [])[0] || ''}`);
    else if (ft === 'CALLOUT') callouts.push(a.calloutAsset?.calloutText);
    else if (ft === 'STRUCTURED_SNIPPET') snippets.push(`${a.structuredSnippetAsset?.header}: ${(a.structuredSnippetAsset?.values || []).join(', ')}`);
    else other.push(ft);
  }
  console.log('\nSITELINKS (', sitelinks.length, '):'); sitelinks.forEach((s) => console.log('  •', s));
  console.log('\nCALLOUTS (', callouts.length, '):', callouts.join(' | '));
  console.log('\nSTRUCTURED SNIPPETS (', snippets.length, '):'); snippets.forEach((s) => console.log('  •', s));
  if (other.length) console.log('\nANDRE:', other.join(', '));
  console.log('\nFerdig.');
})().catch((e) => console.log('FEIL', e.message));
