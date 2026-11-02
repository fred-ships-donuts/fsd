import { createContext, useContext } from 'react';

// PROVISIONAL: palettes and symbol sets are placeholders until the author defines them (SPEC 6.7).
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

export const themes: Record<string, { label: string; palette: Palette }> = {
  dracula: { label: 'Dracula', palette: { header: '#bd93f9', title: '#ff79c6', focus: '#50fa7b', checked: '#8be9fd', hint: '#6272a4', barFull: '#bd93f9', barEmpty: '#44475a', success: '#50fa7b', warning: '#f1fa8c', error: '#ff5555' } },
  lisa: { label: 'Apple Lisa', palette: { header: '#ffffff', title: '#ffffff', focus: '#ffffff', checked: '#cccccc', hint: '#999999', barFull: '#ffffff', barEmpty: '#555555', success: '#ffffff', warning: '#cccccc', error: '#ffffff' } },
  win98: { label: 'Windows 98', palette: { header: '#00ffff', title: '#ffff00', focus: '#ffffff', checked: '#00ff00', hint: '#c0c0c0', barFull: '#0000ff', barEmpty: '#808080', success: '#00ff00', warning: '#ffff00', error: '#ff0000' } },
  dark: { label: 'Dark Night', palette: { header: '#7aa2f7', title: '#bb9af7', focus: '#9ece6a', checked: '#7dcfff', hint: '#565f89', barFull: '#7aa2f7', barEmpty: '#292e42', success: '#9ece6a', warning: '#e0af68', error: '#f7768e' } },
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

export const symbolSets: Record<string, Symbols> = {
  unicode: { label: 'Unicode', marker: '❯', checked: '◉', unchecked: '○', barFull: '█', barEmpty: '░', up: '↑', down: '↓' },
  ascii: { label: 'ASCII', marker: '>', checked: '[x]', unchecked: '[ ]', barFull: '#', barEmpty: '-', up: '^', down: 'v' },
};

export interface ThemeContext {
  palette: Palette;
  symbols: Symbols;
  color: boolean;
}

export const colorEnabled = (): boolean => !process.env['NO_COLOR'];

export function resolveTheme(themeId: string, symbolsId: string): ThemeContext {
  return {
    palette: (themes[themeId] ?? themes['dracula']!).palette,
    symbols: symbolSets[symbolsId] ?? symbolSets['unicode']!,
    color: colorEnabled(),
  };
}

export const Theme = createContext<ThemeContext>(resolveTheme('dracula', 'unicode'));
export const useTheme = (): ThemeContext => useContext(Theme);

// Props spread for <Text>/<Box>; no color at all when NO_COLOR is set.
export const tint = (hex: string, on: boolean): { color?: string } => (on ? { color: hex } : {});
