import { Box, Text } from 'ink';
import { compactFooter } from '../layout.js';
import { tint, useTheme } from '../theme.js';

// The progress bar with its label, and the key hint under it (SPEC 6.4). On a low window only the hint is left.
export function Footer({ fraction, label, hint, rows = 24, columns = 80 }: { fraction: number; label: string; hint: string; rows?: number; columns?: number }) {
  const { palette, symbols, color } = useTheme();
  if (compactFooter(rows)) {
    return (
      <Box flexShrink={0}>
        <Text wrap="truncate-end" {...tint(palette.hint, color)}>{hint}</Text>
      </Box>
    );
  }
  const width = Math.max(4, Math.min(24, columns - label.length - 6)); // the bar gives way to the label on a narrow window
  const filled = Math.round(Math.max(0, Math.min(1, fraction)) * width);
  return (
    <Box flexDirection="column" flexShrink={0} marginTop={1}>
      <Text wrap="truncate-end">
        <Text {...tint(palette.barFull, color)}>{symbols.barFull.repeat(filled)}</Text>
        <Text {...tint(palette.barEmpty, color)}>{symbols.barEmpty.repeat(width - filled)}</Text>
        {'  '}
        {label}
      </Text>
      <Text wrap="truncate-end" {...tint(palette.hint, color)}>{hint}</Text>
    </Box>
  );
}
