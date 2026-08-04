// Gjør at prober kan importere app-moduler som bruker '@/lib/...'-aliaset.
// Next.js resolver aliaset via jsconfig; ren Node gjør det ikke. Uten dette
// måtte vi enten skrive relative importer i appkoden (avviker fra resten av
// kodebasen) eller la testene være — begge dårlige bytter.
//
// Bruk:  node --import ./scripts/_alias-loader.mjs scripts/<probe>.mjs
import { register } from 'node:module';

register('./_alias-hooks.mjs', import.meta.url);
