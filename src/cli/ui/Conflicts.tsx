import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { ConflictChoice } from '../actions/types.js';
import { tint, useTheme } from './theme.js';

export interface ConflictRow {
  name: string;
  paths: string[];
  canUnlinked: boolean;
}

const LABEL: Record<ConflictChoice, string> = {
  keep: 'keep the original, skip ours',
  unlinked: 'install ours, keep the original (not linked)',
  replace: 'replace the original with ours',
};

export const choicesFor = (row: ConflictRow): ConflictChoice[] => (row.canUnlinked ? ['keep', 'unlinked', 'replace'] : ['keep', 'replace']);

// One row per conflict; space cycles the choice. Enter and ← belong to the App.
export function Conflicts({ rows, choices, onChange }: { rows: ConflictRow[]; choices: Record<string, ConflictChoice>; onChange: (name: string, choice: ConflictChoice) => void }) {
  const { palette, symbols, color } = useTheme();
  const [cursor, setCursor] = useState(0);

  useInput((input, key) => {
    if (key.upArrow || key.downArrow) setCursor((current) => (current + (key.upArrow ? -1 : 1) + rows.length) % rows.length);
    else if (input === ' ') {
      const row = rows[cursor];
      if (!row) return;
      const options = choicesFor(row);
      const next = options[(options.indexOf(choices[row.name] ?? 'keep') + 1) % options.length]!;
      onChange(row.name, next);
    }
  });

  return (
    <Box flexDirection="column">
      <Text {...tint(palette.warning, color)}>A skill with the same name already exists and was not installed by fsd.</Text>
      <Text>Space changes the choice for each one. The default keeps the original.{'\n'}</Text>
      {rows.map((row, index) => (
        <Box key={row.name} flexDirection="column" marginBottom={1}>
          <Text {...tint(palette.focus, index === cursor && color)}>
            {index === cursor ? symbols.marker : ' '} {row.name}: <Text bold>{LABEL[choices[row.name] ?? 'keep']}</Text>
          </Text>
          <Text {...tint(palette.hint, color)}>    {row.paths.join(', ')}</Text>
        </Box>
      ))}
    </Box>
  );
}
