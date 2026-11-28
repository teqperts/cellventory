// constants/appVersion.js
import * as Updates from 'expo-updates';

import appConfig from '../app.json';

export const APP_RELEASE_STAGE = 'Beta';
export const APP_VERSION = appConfig?.expo?.version || '1.0.0';
export const APP_FALLBACK_UPDATE_DATE = '2026-11-28T12:25:00+05:30';

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
 * Returns the display version string, e.g. "v1.0.0 Beta".
 */
export function getFormattedAppVersion() {
  return `v${APP_VERSION} ${APP_RELEASE_STAGE}`;
}

/**
 * Returns active version & OTA/build update date details from expo-updates
 * (falling back cleanly to the release metadata in dev mode).
 */
export function getAppUpdateInfo(updatesSource = Updates) {
  const sourceDate = updatesSource?.createdAt || APP_FALLBACK_UPDATE_DATE;
  const formattedDate = formatUpdateDate(sourceDate);
  const channel = updatesSource?.channel || null;
  const updateIdShort = updatesSource?.updateId ? String(updatesSource.updateId).slice(0, 8) : null;

  return {
    version: APP_VERSION,
    stage: APP_RELEASE_STAGE,
    versionLabel: getFormattedAppVersion(),
    formattedDate,
    channel,
    updateIdShort,
    isOtaUpdate: Boolean(updatesSource?.updateId && !updatesSource?.isEmbeddedLaunch),
  };
}
