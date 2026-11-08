import { createContext, useContext } from 'react';

// The only palette: colors taken from the 🍩 emoji (Noto Color Emoji), SPEC 6.7.
export interface Palette {
  header: string;
  title: string;
  focus: string;
  checked: string;
  hint: string;
  barFull: string;
  barEmpty: string;
  success: string;
  warning: string;
  error: string;
}

export const DEFAULT_THEME = 'donut';

// `donut` is the palette of the hand-tuned 🍩 (donutMap.ts), the same colours as the picture (default); the others are alternatives to compare (docs/PALETAS-DONUT.md).
export const themes: Record<string, { label: string; palette: Palette }> = {
  donut: {
    label: 'Donut',
    palette: { header: '#f5b03e', title: '#fcb702', focus: '#f57ba8', checked: '#fca8a6', hint: '#b79279', barFull: '#de8013', barEmpty: '#875b4f', success: '#fcb702', warning: '#de8013', error: '#fc5e5b' },
  },
  morango: {
    label: 'Morango',
    palette: { header: '#ff8fb8', title: '#ffd27a', focus: '#ff6fa3', checked: '#ffb3cc', hint: '#9c7a6e', barFull: '#ff6fa3', barEmpty: '#4a3530', success: '#90c0e0', warning: '#ffb020', error: '#ff5b5b' },
  },
  chocolate: {
    label: 'Chocolate ao leite',
    palette: { header: '#e8c39e', title: '#d9a25f', focus: '#f2b680', checked: '#f5d9b5', hint: '#8c6a52', barFull: '#c8843a', barEmpty: '#5a3e2e', success: '#9ed9e8', warning: '#f0c040', error: '#e8604c' },
  },
  granulado: {
    label: 'Granulado',
    palette: { header: '#90c0e0', title: '#f070a0', focus: '#f0b030', checked: '#ff6464', hint: '#a8a0b8', barFull: '#f070a0', barEmpty: '#3c2a22', success: '#7ed8a0', warning: '#ff9a4c', error: '#ff4f4f' },
  },
};

export interface Symbols {
  label: string;
  marker: string;
  checked: string;
  unchecked: string;
  barFull: string;
  barEmpty: string;
  up: string;
  down: string;
}

export const symbols: Symbols = { label: 'Unicode', marker: '❯', checked: '◉', unchecked: '○', barFull: '█', barEmpty: '░', up: '↑', down: '↓' };

export interface ThemeContext {
  palette: Palette;
  symbols: Symbols;
  color: boolean;
}

export const colorEnabled = (): boolean => !process.env['NO_COLOR'];

export function resolveTheme(themeId: string): ThemeContext {
  return {
    palette: (themes[themeId] ?? themes[DEFAULT_THEME]!).palette,
    symbols,
    color: colorEnabled(),
  };
}

export const Theme = createContext<ThemeContext>(resolveTheme(DEFAULT_THEME));
export const useTheme = (): ThemeContext => useContext(Theme);

// Props spread for <Text>/<Box>; no color at all when NO_COLOR is set.
export const tint = (hex: string, on: boolean): { color?: string } => (on ? { color: hex } : {});
