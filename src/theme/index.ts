import { AppFontFamily, ThemeMode } from '../types';
import { FontConfig, FONT_CONFIGS } from './fonts';
import { useStore } from '../store/useStore';

export interface AccentColorOption {
  id: string;
  label: string;
  hex: string;
}

export const ACCENT_COLORS: AccentColorOption[] = [
  { id: 'amber', label: 'Kehribar Turuncu (Varsayılan)', hex: '#F5A623' },
  { id: 'gold', label: 'Altın Sarısı', hex: '#FFB300' },
  { id: 'sunflower', label: 'Ayçiçeği Sarısı', hex: '#EAB308' },
  { id: 'tangerine', label: 'Mandalina', hex: '#FF8C00' },
  { id: 'sunset', label: 'Gün Batımı Turuncusu', hex: '#F97316' },
  { id: 'coral', label: 'Mercan', hex: '#FF6B6B' },
  { id: 'crimson', label: 'Kızıl Elma', hex: '#EF4444' },
  { id: 'ruby', label: 'Yakut Kırmızısı', hex: '#E11D48' },
  { id: 'rose', label: 'Gül Pembesi', hex: '#F43F5E' },
  { id: 'sakura', label: 'Kiraz Çiçeği', hex: '#EC4899' },
  { id: 'flamingo', label: 'Flamingo Pembesi', hex: '#F472B6' },
  { id: 'magenta', label: 'Fuşya / Macenta', hex: '#D946EF' },
  { id: 'orchid', label: 'Orkide Moru', hex: '#C026D3' },
  { id: 'amethyst', label: 'Ametist Moru', hex: '#9333EA' },
  { id: 'violet', label: 'Menekşe Moru', hex: '#8B5CF6' },
  { id: 'lavender', label: 'Lavanta', hex: '#A78BFA' },
  { id: 'indigo', label: 'İndigo', hex: '#6366F1' },
  { id: 'royal', label: 'Kraliyet Mavisi', hex: '#3B82F6' },
  { id: 'sapphire', label: 'Safir Mavisi', hex: '#2563EB' },
  { id: 'cobalt', label: 'Kobalt Mavisi', hex: '#1D4ED8' },
  { id: 'ocean', label: 'Okyanus Mavisi', hex: '#0284C7' },
  { id: 'sky', label: 'Gökyüzü Mavisi', hex: '#0EA5E9' },
  { id: 'cyan', label: 'Camgöbeği', hex: '#06B6D4' },
  { id: 'turquoise', label: 'Turkuaz', hex: '#14B8A6' },
  { id: 'mint', label: 'Nane Yeşili', hex: '#2DD4BF' },
  { id: 'emerald', label: 'Zümrüt Yeşili', hex: '#10B981' },
  { id: 'jade', label: 'Yeşim Yeşili', hex: '#059669' },
  { id: 'forest', label: 'Orman Yeşili', hex: '#22C55E' },
  { id: 'lime', label: 'Limon Yeşili', hex: '#84CC16' },
  { id: 'bronze', label: 'Bronz / Bakır', hex: '#D97706' },
];

export const DEFAULT_ACCENT_COLOR = '#F5A623';

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(245,166,35,${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export interface Theme {
  mode: ThemeMode;
  background: string;
  surface: string;
  navBar: string;
  pill: string;
  pillSelected: string;
  pillSelectedText: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  accentSoft: string;
  border: string;
  overlay: string;
  danger: string;
  checkEmpty: string;
  fonts: FontConfig;
}

export const darkThemeColors = {
  mode: 'dark' as ThemeMode,
  background: '#000000',
  surface: '#1C1C1E',
  navBar: '#000000',
  pill: '#1C1C1E',
  pillSelected: '#3A3A3C',
  pillSelectedText: '#FFFFFF',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  textTertiary: '#636366',
  accent: '#F5A623',
  border: '#2C2C2E',
  overlay: 'rgba(0,0,0,0.6)',
  danger: '#FF453A',
  checkEmpty: '#48484A',
};

export const lightThemeColors = {
  mode: 'light' as ThemeMode,
  background: '#F2F2F7',
  surface: '#FFFFFF',
  navBar: '#FFFFFF',
  pill: '#E5E5EA',
  pillSelected: '#D1D1D6',
  pillSelectedText: '#1C1C1E',
  text: '#1C1C1E',
  textSecondary: '#636366',
  textTertiary: '#8E8E93',
  accent: '#F5A623',
  border: '#E0E0E5',
  overlay: 'rgba(0,0,0,0.35)',
  danger: '#FF3B30',
  checkEmpty: '#C7C7CC',
};

export const getTheme = (
  mode: ThemeMode,
  fontFamily: AppFontFamily = 'inter',
  accentColor: string = DEFAULT_ACCENT_COLOR,
): Theme => {
  const base = mode === 'dark' ? darkThemeColors : lightThemeColors;
  const fontCfg = FONT_CONFIGS[fontFamily] ?? FONT_CONFIGS.inter;
  const resolvedAccent = accentColor || DEFAULT_ACCENT_COLOR;
  return {
    ...base,
    accent: resolvedAccent,
    accentSoft: hexToRgba(resolvedAccent, mode === 'dark' ? 0.16 : 0.12),
    fonts: fontCfg,
  };
};

export const darkTheme: Theme = getTheme('dark', 'inter');
export const lightTheme: Theme = getTheme('light', 'inter');

export const fonts = {
  get regular() {
    const ff = useStore.getState?.()?.fontFamily ?? 'inter';
    return (FONT_CONFIGS[ff] ?? FONT_CONFIGS.inter).regular;
  },
  get semiBold() {
    const ff = useStore.getState?.()?.fontFamily ?? 'inter';
    return (FONT_CONFIGS[ff] ?? FONT_CONFIGS.inter).semiBold;
  },
  get bold() {
    const ff = useStore.getState?.()?.fontFamily ?? 'inter';
    return (FONT_CONFIGS[ff] ?? FONT_CONFIGS.inter).bold;
  },
};

export const FAB_COLOR = '#FFB300';

export const useTheme = (): Theme => {
  const mode = useStore((s) => s.theme);
  const fontFamily = useStore((s) => s.fontFamily);
  const accentColor = useStore((s) => s.accentColor);
  return getTheme(mode, fontFamily, accentColor);
};
