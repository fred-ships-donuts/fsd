import { Box, Text } from 'ink';
import { Hero } from '../hero/Hero.js';
import { heroLayout } from '../hero/layout.js';
import { compactHeader, MIN_LOGO_WIDTH } from '../layout.js';
import { tint, useTheme } from '../theme.js';

// `where` is the scope and step shown on step screens. `hero` shows the big 🍩 header (the menu only, with colour);
// everything else gets the small header (SPEC 6.7), a single line on a low window.
export function Header({ version, where, hero = false, columns, rows = 24 }: { version: string; where?: string; hero?: boolean; columns: number; rows?: number }) {
  const { palette, color } = useTheme();
  const layout = hero && color ? heroLayout(columns, rows) : null;
  if (layout) return <Hero layout={layout} />;
  const title = `fsd v${version}${where ? `  ·  ${where}` : ''}`;
  if (compactHeader(rows)) {
    return (
      <Box flexShrink={0} paddingX={1}>
        <Text wrap="truncate-end" {...tint(palette.header, color)}>{`🍩 ${title}`}</Text>
      </Box>
    );
  }
  return (
    <Box flexDirection="column" flexShrink={0} alignSelf="flex-start" marginBottom={1} paddingX={1} maxWidth={columns}>
      {columns >= MIN_LOGO_WIDTH && <Text {...tint(palette.header, color)}>🍩 F S D</Text>}
      <Text wrap="truncate-end" {...tint(palette.header, color)}>{title}</Text>
    </Box>
  );
}
