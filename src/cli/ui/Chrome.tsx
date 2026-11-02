import { Box, Text } from 'ink';
import { renderBar } from './progress.js';
import { tint, useTheme } from './theme.js';

const MIN_LOGO_WIDTH = 40;

// PROVISIONAL logo and header items (SPEC 6.7).
export function Header({ version, detail }: { version: string; detail?: string }) {
  const { palette, color } = useTheme();
  const wide = (process.stdout.columns || 80) >= MIN_LOGO_WIDTH;
  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1} marginBottom={1} {...(color ? { borderColor: palette.header } : {})}>
      {wide && <Text {...tint(palette.header, color)}>🍩 F S D</Text>}
      <Text {...tint(palette.header, color)}>
        fsd v{version}
        {detail ? `  ·  ${detail}` : ''}
      </Text>
    </Box>
  );
}

export function Footer({ fraction, label, hint }: { fraction: number; label: string; hint: string }) {
  const { palette, symbols, color } = useTheme();
  const width = 24;
  const filled = renderBar(fraction, width, symbols.barFull, symbols.barEmpty).split('');
  const count = Math.round(Math.max(0, Math.min(1, fraction)) * width);
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text>
        <Text {...tint(palette.barFull, color)}>{filled.slice(0, count).join('')}</Text>
        <Text {...tint(palette.barEmpty, color)}>{filled.slice(count).join('')}</Text>
        {'  '}
        {label}
      </Text>
      <Text {...tint(palette.hint, color)}>{hint}</Text>
    </Box>
  );
}
