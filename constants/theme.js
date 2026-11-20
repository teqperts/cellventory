// constants/theme.js

export const colors = {
  // Brand colors
  primary: '#1B3C57',       // Deep Slate Navy
  primaryLight: '#2C5A7D',
  primaryDark: '#12283A',
  accent: '#2563EB',        // Modern Royal Blue
  teqperts: '#0078D7',      // Teqperts Brand Azure Blue (matches logo)
  teqpertsLight: '#EBF5FE',

  // Surfaces & Backgrounds
  background: '#F8FAFC',    // Slate 50
  surface: '#FFFFFF',
  surfaceSubtle: '#F1F5F9', // Slate 100
  border: '#E2E8F0',        // Slate 200
  borderFocus: '#2563EB',

  // Typography
  textPrimary: '#0F172A',   // Slate 900
  textSecondary: '#475569', // Slate 600
  textMuted: '#94A3B8',     // Slate 400
  textInverse: '#FFFFFF',

  // Stock Status Health
  inStock: '#10B981',       // Emerald 500
  inStockBg: '#ECFDF5',
  lowStock: '#F59E0B',      // Amber 500
  lowStockBg: '#FFFBEB',
  outOfStock: '#EF4444',    // Red 500
  outOfStockBg: '#FEF2F2',
};

export const shadows = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  floating: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 3,
  },
};

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 9999,
};

export default {
  colors,
  shadows,
  borderRadius,
};
