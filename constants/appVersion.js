// constants/appVersion.js
import * as Updates from 'expo-updates';

import appConfig from '../app.json';

export const APP_RELEASE_STAGE = 'Beta';
export const APP_VERSION = appConfig?.expo?.version || '1.0.0';
export const APP_FALLBACK_UPDATE_DATE = '2026-11-28T12:35:00+05:30';

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Resolves the human-readable release stage label from the active EAS Update channel.
 * - development / local dev -> "Beta"
 * - preview                 -> "Preview"
 * - production              -> "" (no prerelease badge)
 */
export function getReleaseStageForChannel(channel) {
  const normalized = typeof channel === 'string' ? channel.trim().toLowerCase() : '';
  if (normalized === 'production') return '';
  if (normalized === 'preview') return 'Preview';
  if (normalized === 'development' || !normalized) return 'Beta';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

/**
 * Formats a Date into a clean deterministic string like "28 Nov 2026".
 */
export function formatUpdateDate(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (!d || isNaN(d.getTime())) return '28 Nov 2026';
  const day = d.getDate();
  const month = SHORT_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Returns the display version string, e.g. "v1.0.0 Beta", "v1.0.0 Preview", or "v1.0.0".
 */
export function getFormattedAppVersion(updatesSource = Updates) {
  const stage = getReleaseStageForChannel(updatesSource?.channel);
  return stage ? `v${APP_VERSION} ${stage}` : `v${APP_VERSION}`;
}

/**
 * Returns active version & OTA/build update date details from expo-updates
 * (falling back cleanly to the release metadata in dev mode).
 */
export function getAppUpdateInfo(updatesSource = Updates) {
  const sourceDate = updatesSource?.createdAt || APP_FALLBACK_UPDATE_DATE;
  const formattedDate = formatUpdateDate(sourceDate);
  const channel = updatesSource?.channel || null;
  const stage = getReleaseStageForChannel(channel);
  const updateIdShort = updatesSource?.updateId ? String(updatesSource.updateId).slice(0, 8) : null;

  return {
    version: APP_VERSION,
    stage,
    versionLabel: stage ? `v${APP_VERSION} ${stage}` : `v${APP_VERSION}`,
    formattedDate,
    channel,
    updateIdShort,
    isOtaUpdate: Boolean(updatesSource?.updateId && !updatesSource?.isEmbeddedLaunch),
  };
}
