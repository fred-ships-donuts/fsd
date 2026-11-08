import { Text } from 'ink';
import { tint, useTheme } from '../theme.js';

// The title of a screen, with a blank line under it.
export function Title({ text }: { text: string }) {
  const { palette, color } = useTheme();
  return <Text bold {...tint(palette.title, color)}>{text}{'\n'}</Text>;
}
