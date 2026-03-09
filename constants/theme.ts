// ========================================
// SmartSpend AI — Dark Fintech Theme
// ========================================

export const Colors = {
  // Core backgrounds
  background: '#0A0E1A',
  surface: '#111827',
  surfaceLight: '#1E293B',
  surfaceGlass: 'rgba(30, 41, 59, 0.6)',

  // Accent / brand
  primary: '#6C63FF',
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',

  // Semantic
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',

  // Text
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',

  // Borders
  border: '#1E293B',
  borderLight: '#334155',

  // Gradient presets
  gradientPrimary: ['#6C63FF', '#4F46E5'] as const,
  gradientDark: ['#0F172A', '#0A0E1A'] as const,
  gradientCard: ['#1E293B', '#111827'] as const,
  gradientSuccess: ['#10B981', '#059669'] as const,
  gradientWarning: ['#F59E0B', '#D97706'] as const,
  gradientDanger: ['#EF4444', '#DC2626'] as const,

  // Tab bar
  tabBar: '#0F172A',
  tabActive: '#6C63FF',
  tabInactive: '#64748B',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
  hero: 36,
};

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  button: {
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
};
