// __tests__/appVersion.test.js

const mockUpdates = {
  createdAt: null,
  channel: null,
  updateId: null,
  isEmbeddedLaunch: true,
};

jest.mock('expo-updates', () => mockUpdates);

import {
  APP_RELEASE_STAGE,
  APP_VERSION,
  formatUpdateDate,
  getAppUpdateInfo,
  getFormattedAppVersion,
} from '../constants/appVersion';

describe('appVersion metadata helpers', () => {
  beforeEach(() => {
    mockUpdates.createdAt = null;
    mockUpdates.channel = null;
    mockUpdates.updateId = null;
    mockUpdates.isEmbeddedLaunch = true;
  });

  it('uses Beta release stage and formats version label', () => {
    expect(APP_RELEASE_STAGE).toBe('Beta');
    expect(getFormattedAppVersion()).toBe(`v${APP_VERSION} Beta`);
  });

  it('formats update dates deterministically as "D Mon YYYY"', () => {
    expect(formatUpdateDate(new Date(2026, 10, 28, 12, 30, 0))).toBe('28 Nov 2026');
  });

  it('uses fallback update date when expo-updates createdAt is null', () => {
    const info = getAppUpdateInfo();
    expect(info.versionLabel).toBe(`v${APP_VERSION} Beta`);
    expect(info.formattedDate).toBe('28 Nov 2026');
    expect(info.isOtaUpdate).toBe(false);
  });

  it('uses live expo-updates createdAt, channel, and short updateId when available', () => {
    const info = getAppUpdateInfo({
      createdAt: new Date(2026, 11, 5, 9, 15, 0),
      channel: 'development',
      updateId: 'abd7ae4c-7b2d-4af7-8f83-bdd27e8ef6cd',
      isEmbeddedLaunch: false,
    });
    expect(info.versionLabel).toBe(`v${APP_VERSION} Beta`);
    expect(info.formattedDate).toBe('5 Dec 2026');
    expect(info.channel).toBe('development');
    expect(info.updateIdShort).toBe('abd7ae4c');
    expect(info.isOtaUpdate).toBe(true);
  });
});
