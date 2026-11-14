import { AppFontFamily, ThemeMode } from '../types';
import { FontConfig, FONT_CONFIGS } from './fonts';
import { useStore } from '../store/useStore';

export interface Theme {
  mode: ThemeMode;
  background: string;
  surface: string;
  pill: string;
  pillSelected: string;
  pillSelectedText: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
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

export const getTheme = (mode: ThemeMode, fontFamily: AppFontFamily = 'inter'): Theme => {
  const base = mode === 'dark' ? darkThemeColors : lightThemeColors;
  const fontCfg = FONT_CONFIGS[fontFamily] ?? FONT_CONFIGS.inter;
  return {
    ...base,
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

export { useTheme } from './useTheme';

