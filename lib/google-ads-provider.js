// ---------------------------------------------------------------------------
// Google Ads provider-velger.
//
// Bruker NATIVE Google Ads API (egne credentials) når den er konfigurert,
// ellers faller den tilbake til Composio-broen. Eksporterer samme funksjons-
// navn som den gamle composio-google-ads-modulen → drop-in for route.js.
// ---------------------------------------------------------------------------

import * as composio from './composio-google-ads';
import * as native from './google-ads-native';

export const GOOGLE_PERIODS = native.GOOGLE_PERIODS;

function useNative() { return native.googleAdsNativeConfigured(); }

export function activeProvider() {
  if (useNative()) return 'native';
  if (composio.composioConfigured()) return 'composio';
  return 'none';
}

// «Er Google Ads-rapportering tilgjengelig?» (native ELLER composio).
export function composioConfigured() {
  return useNative() || composio.composioConfigured();
}

export function defaultCustomerId() {
  return native.defaultCustomerId() || composio.defaultCustomerId();
}

export async function getConnectionStatus() {
  return useNative() ? native.getConnectionStatus() : composio.getConnectionStatus();
}

export async function createConnectLink(db, opts) {
  return useNative() ? native.createConnectLink(db, opts) : composio.createConnectLink(db, opts);
}

export async function runCampaignReport(args) {
  return useNative() ? native.runCampaignReport(args) : composio.runCampaignReport(args);
}

export async function getCachedReport(db, period, opts) {
  return useNative() ? native.getCachedReport(db, period, opts) : composio.getCachedReport(db, period, opts);
}

export async function getCachedCreatives(db, opts) {
  return useNative() ? native.getCachedCreatives(db, opts) : composio.getCachedCreatives(db, opts);
}
