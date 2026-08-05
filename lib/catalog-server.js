import { getDb } from '@/lib/mongodb';
import { WIZARD_CATALOG_DEFAULT } from '@/lib/catalog';

// Server-side katalogoppslag. Admin kan overstyre priser og innhold via
// settings.wizard_catalog; da skal BÅDE priskalkulatoren og de offentlige
// prissidene endre seg samtidig. Egen fil fordi den importerer MongoDB og
// derfor aldri må havne i en klientkomponent.
export async function getCatalog() {
  try {
    const db = await getDb();
    const doc = await db.collection('settings').findOne({ key: 'wizard_catalog' });
    if (doc && doc.value && Array.isArray(doc.value.serviceLevels) && doc.value.serviceLevels.length) {
      return doc.value;
    }
  } catch (e) {
    // Katalogen er markedsføringsinnhold, ikke en transaksjon — faller tilbake
    // til standarden i stedet for å velte siden.
  }
  return WIZARD_CATALOG_DEFAULT;
}
