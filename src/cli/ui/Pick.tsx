import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { tint, useTheme } from './theme.js';

export interface Option {
  value: string;
  label: string;
  hint?: string;
}

// Controlled list. Enter and esc belong to the App; the step handles only cursor and marking.
export function Pick({ options, selected, multi, withAll, onChange }: {
  options: Option[];
  selected: string[];
  multi: boolean;
  withAll?: boolean;
  onChange: (selected: string[], focused: string) => void;
}) {
  const { palette, symbols, color } = useTheme();
  const rows: Option[] = withAll ? [{ value: '*', label: 'Select all' }, ...options] : options;
  const [cursor, setCursor] = useState(Math.max(0, rows.findIndex((row) => selected.includes(row.value))));

  const allChecked = options.length > 0 && options.every((option) => selected.includes(option.value));
  const isChecked = (row: Option) => (row.value === '*' ? allChecked : selected.includes(row.value));

  const choose = (index: number) => {
    const row = rows[index];
    if (!row) return;
    if (!multi) return onChange([row.value], row.value);
    if (row.value === '*') return onChange(allChecked ? [] : options.map((option) => option.value), row.value);
    onChange(selected.includes(row.value) ? selected.filter((value) => value !== row.value) : [...selected, row.value], row.value);
  };

  useInput((input, key) => {
    if (key.upArrow || key.downArrow) {
      const next = (cursor + (key.upArrow ? -1 : 1) + rows.length) % rows.length;
      setCursor(next);
      if (!multi) choose(next);
    } else if (multi && input === ' ') {
      choose(cursor);
    }
  });

  return (
    <Box flexDirection="column">
      {rows.map((row, index) => {
        const focused = index === cursor;
        return (
          <Text key={row.value} {...tint(palette.focus, focused && color)}>
            {focused ? symbols.marker : ' '} {isChecked(row) ? symbols.checked : symbols.unchecked} {row.label}
            {row.hint ? <Text {...tint(palette.hint, color)}>  {row.hint}</Text> : null}
          </Text>
        );
      })}
    </Box>
  );
}
