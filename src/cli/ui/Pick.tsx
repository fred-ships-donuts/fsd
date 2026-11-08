import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { tint, useTheme } from './theme.js';

export interface Option {
  value: string;
  label: string;
  hint?: string;
}

// Controlled list. Enter and esc belong to the App; the step handles only cursor and marking.
export function Pick({ options, selected, multi, withAll, maxRows, onChange }: {
  options: Option[];
  selected: string[];
  multi: boolean;
  withAll?: boolean;
  maxRows?: number; // the list scrolls to keep the focused row visible when it has more rows than this
  onChange: (selected: string[], focused: string) => void;
}) {
  const { palette, symbols, color } = useTheme();
  const rows: Option[] = withAll ? [{ value: '*', label: 'Select all' }, ...options] : options;
  const [cursor, setCursor] = useState(multi ? 0 : Math.max(0, rows.findIndex((row) => selected.includes(row.value))));

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

  const limit = Math.max(1, maxRows ?? rows.length);
  const start = rows.length <= limit ? 0 : Math.min(Math.max(0, cursor - Math.floor(limit / 2)), rows.length - limit);
  return (
    <Box flexDirection="column">
      {rows.slice(start, start + limit).map((row, offset) => {
        const index = start + offset;
        const focused = index === cursor;
        return (
          <Text key={row.value} wrap="truncate-end" {...tint(palette.focus, focused && color)}>
            {focused ? symbols.marker : ' '} {isChecked(row) ? symbols.checked : symbols.unchecked} {row.label}
            {row.hint ? <Text {...tint(palette.hint, color)}>  {row.hint}</Text> : null}
          </Text>
        );
      })}
    </Box>
  );
}
