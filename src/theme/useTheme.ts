import { useStore } from '../store/useStore';
import { getTheme, Theme } from './index';

export const useTheme = (): Theme => {
  const mode = useStore((s) => s.theme);
  const fontFamily = useStore((s) => s.fontFamily);
  return getTheme(mode, fontFamily);
};
