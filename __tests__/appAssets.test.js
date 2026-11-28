// __tests__/appAssets.test.js
const fs = require('fs');
const path = require('path');

describe('App Icon & Splash Screen Configuration', () => {
  const rootDir = path.resolve(__dirname, '..');
  const appJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'app.json'), 'utf8'));
  const expoCfg = appJson.expo;

  it('references valid existing asset files in app.json', () => {
    const assetPaths = [
      expoCfg.icon,
      expoCfg.splash?.image,
      expoCfg.android?.icon,
      expoCfg.android?.adaptiveIcon?.foregroundImage,
      expoCfg.web?.favicon,
    ].filter(Boolean);

    expect(assetPaths.length).toBeGreaterThanOrEqual(4);
    assetPaths.forEach((relPath) => {
      const fullPath = path.join(rootDir, relPath);
      expect(fs.existsSync(fullPath)).toBe(true);
    });
  });

  it('configures expo-splash-screen plugin cleanly for Android 12+', () => {
    const splashPlugin = (expoCfg.plugins || []).find(
      (entry) => Array.isArray(entry) && entry[0] === 'expo-splash-screen'
    );

    expect(splashPlugin).toBeDefined();
    const pluginConfig = splashPlugin[1];
    expect(pluginConfig.backgroundColor).toBe('#141821');
    expect(pluginConfig.imageWidth).toBe(200);
    expect(pluginConfig.resizeMode).toBe('contain');
    expect(fs.existsSync(path.join(rootDir, pluginConfig.image))).toBe(true);
    expect(pluginConfig.android?.backgroundColor).toBe('#141821');
    expect(fs.existsSync(path.join(rootDir, pluginConfig.android?.image))).toBe(true);
  });

  it('uses matching #141821 brand background for adaptive icon and splash', () => {
    expect(expoCfg.splash?.backgroundColor).toBe('#141821');
    expect(expoCfg.android?.adaptiveIcon?.backgroundColor).toBe('#141821');
  });

  it('includes transparent header logo asset for app headers', () => {
    expect(fs.existsSync(path.join(rootDir, 'assets/header-logo.png'))).toBe(true);
  });
});
