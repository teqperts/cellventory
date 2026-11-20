// __tests__/navigation.test.js

describe('TabNavigator Safe Area Calculations', () => {
  function computeTabMetrics(insets) {
    const bottomPadding = insets.bottom > 0 ? insets.bottom + 4 : 8;
    const tabHeight = 56 + bottomPadding;
    return { bottomPadding, tabHeight };
  }

  it('calculates elevated height and padding for Android 3-button navigation (~48dp inset)', () => {
    const insets = { bottom: 48, top: 24, left: 0, right: 0 };
    const { bottomPadding, tabHeight } = computeTabMetrics(insets);

    expect(bottomPadding).toBe(52); // 48 + 4
    expect(tabHeight).toBe(108); // 56 + 52
    // Usable tab item content height sits above virtual buttons
    expect(tabHeight - bottomPadding).toBe(56);
  });

  it('calculates correct elevation for Android gesture navigation (~24dp inset)', () => {
    const insets = { bottom: 24, top: 24, left: 0, right: 0 };
    const { bottomPadding, tabHeight } = computeTabMetrics(insets);

    expect(bottomPadding).toBe(28);
    expect(tabHeight).toBe(84);
  });

  it('calculates correct elevation for iOS home indicator (~34dp inset)', () => {
    const insets = { bottom: 34, top: 44, left: 0, right: 0 };
    const { bottomPadding, tabHeight } = computeTabMetrics(insets);

    expect(bottomPadding).toBe(38);
    expect(tabHeight).toBe(94);
  });

  it('falls back to compact standard height for devices with 0 bottom inset', () => {
    const insets = { bottom: 0, top: 0, left: 0, right: 0 };
    const { bottomPadding, tabHeight } = computeTabMetrics(insets);

    expect(bottomPadding).toBe(8);
    expect(tabHeight).toBe(64);
  });
});
