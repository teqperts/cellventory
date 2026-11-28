// __tests__/appVersion.test.js

const mockUpdates = {
  createdAt: null,
  channel: null,
  updateId: null,
  isEmbeddedLaunch: true,
};

jest.mock('expo-updates', () => mockUpdates);

import {
  APP_VERSION,
  formatUpdateDate,
  getAppUpdateInfo,
  getFormattedAppVersion,
  getReleaseStageForChannel,
} from '../constants/appVersion';

describe('appVersion metadata helpers', () => {
  it('maps channels to release stage labels', () => {
    expect(getReleaseStageForChannel(null)).toBe('Beta');
    expect(getReleaseStageForChannel('development')).toBe('Beta');
    expect(getReleaseStageForChannel('preview')).toBe('Preview');
    expect(getReleaseStageForChannel('production')).toBe('');
  });

  it('formats version labels by channel', () => {
    expect(getFormattedAppVersion({ channel: 'development' })).toBe(`v${APP_VERSION} Beta`);
    expect(getFormattedAppVersion({ channel: 'preview' })).toBe(`v${APP_VERSION} Preview`);
    expect(getFormattedAppVersion({ channel: 'production' })).toBe(`v${APP_VERSION}`);
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

  it('uses live expo-updates createdAt, preview channel, and short updateId when available', () => {
    const info = getAppUpdateInfo({
      createdAt: new Date(2026, 11, 5, 9, 15, 0),
      channel: 'preview',
      updateId: 'abd7ae4c-7b2d-4af7-8f83-bdd27e8ef6cd',
      isEmbeddedLaunch: false,
    });
    expect(info.stage).toBe('Preview');
    expect(info.versionLabel).toBe(`v${APP_VERSION} Preview`);
    expect(info.formattedDate).toBe('5 Dec 2026');
    expect(info.channel).toBe('preview');
    expect(info.updateIdShort).toBe('abd7ae4c');
    expect(info.isOtaUpdate).toBe(true);
  });
});
