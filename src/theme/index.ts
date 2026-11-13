import { ThemeMode } from '../types';

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
}

export const darkTheme: Theme = {
  mode: 'dark',
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

export const lightTheme: Theme = {
  mode: 'light',
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

export const getTheme = (mode: ThemeMode): Theme => (mode === 'dark' ? darkTheme : lightTheme);

export const fonts = {
  regular: 'Inter_400Regular',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const FAB_COLOR = '#FFB300';
