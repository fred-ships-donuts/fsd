import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, utimesSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fingerprint, parses, settingsHash, safeToRestart, reexecIfChanged } from './fsd-reload.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const tmp = () => mkdtempSync(join(tmpdir(), 'fsd-reload-'));

test('fingerprint: estável para os mesmos arquivos, muda com mtime, tamanho e arquivo ausente', () => {
  const d = tmp(); const a = join(d, 'a'), b = join(d, 'b');
  writeFileSync(a, 'one'); writeFileSync(b, 'two');
  const t = new Date(1_700_000_000_000); utimesSync(a, t, t); utimesSync(b, t, t);
  const base = fingerprint([a, b]);
  assert.equal(fingerprint([b, a]), base, 'a ordem não importa');
  utimesSync(a, new Date(1_700_000_100_000), new Date(1_700_000_100_000));
  assert.notEqual(fingerprint([a, b]), base, 'mtime');
  utimesSync(a, t, t); assert.equal(fingerprint([a, b]), base);
  writeFileSync(a, 'one!'); utimesSync(a, t, t);
  assert.notEqual(fingerprint([a, b]), base, 'tamanho, com o mesmo mtime');
  assert.notEqual(fingerprint([a, join(d, 'nao-existe')]), fingerprint([a]), 'ausente conta');
  assert.doesNotThrow(() => fingerprint([join(d, 'nao-existe')]));
  rmSync(d, { recursive: true });
});

test('parses: .mjs válido, erro de sintaxe, JSON inválido, arquivo sem extensão e arquivo ausente', () => {
  const d = tmp();
  writeFileSync(join(d, 'ok.mjs'), 'export const x = 1;\n'); assert.equal(parses(join(d, 'ok.mjs')), true);
  writeFileSync(join(d, 'bad.mjs'), 'export const = ;\n'); assert.equal(parses(join(d, 'bad.mjs')), false);
  writeFileSync(join(d, 'ok.json'), '{"a":1}'); assert.equal(parses(join(d, 'ok.json')), true);
  writeFileSync(join(d, 'bad.json'), '{"a":'); assert.equal(parses(join(d, 'bad.json')), false);
  assert.equal(parses(join(d, 'nada')), false);
  writeFileSync(join(d, 'script'), '#!/usr/bin/env node\nimport { x } from "node:os";\nawait 1;\n'); assert.equal(parses(join(d, 'script')), true);
  writeFileSync(join(d, 'script-bad'), '#!/usr/bin/env node\nfunction (\n'); assert.equal(parses(join(d, 'script-bad')), false);
  rmSync(d, { recursive: true });
});

test('parses: os scripts reais do time (sem extensão) compilam', () => {
  for (const f of ['fsd-watch', 'fsd-cleanup', 'fsd-reload.mjs']) assert.equal(parses(join(HERE, f)), true, f);
});

test('settingsHash: muda quando qualquer um dos dois arquivos muda', () => {
  const d = tmp();
  writeFileSync(join(d, 'claude-settings.json'), '{"a":1}'); writeFileSync(join(d, 'redirects.json'), '{"r":1}');
  const h = settingsHash(d); assert.equal(settingsHash(d), h); assert.match(h, /^[0-9a-f]{64}$/);
  writeFileSync(join(d, 'redirects.json'), '{"r":2}'); const h2 = settingsHash(d); assert.notEqual(h2, h);
  writeFileSync(join(d, 'claude-settings.json'), '{"a":2}'); assert.notEqual(settingsHash(d), h2);
  rmSync(d, { recursive: true });
});

test('safeToRestart: só o prompt parado e livre é seguro', () => {
  const idle = '● Pronto.\n╭──╮\n│ >  │\n╰──╯';
  assert.equal(safeToRestart({ pane: idle, paneCommand: 'claude', tools: [] }), true);
  assert.equal(safeToRestart({ pane: idle + '\nesc to interrupt', paneCommand: 'claude', tools: [] }), false, 'trabalhando');
  assert.equal(safeToRestart({ pane: idle, paneCommand: 'claude', tools: [{ tool: 'Bash' }] }), false, 'ferramenta rodando');
  assert.equal(safeToRestart({ pane: idle, paneCommand: 'bash', tools: [] }), false, 'shell');
  for (const l of ['Do you want to proceed?', '❯ 1. Yes', 'Press Enter to continue', 'Do you trust the files in this folder?']) assert.equal(safeToRestart({ pane: `${idle}\n${l}`, paneCommand: 'claude', tools: [] }), false, l);
  assert.equal(safeToRestart({ pane: `${idle}\nYou hit your limit · resets 3pm`, paneCommand: 'claude', tools: [] }), false, 'limite de uso');
  assert.equal(safeToRestart({ pane: "● I don't trust this regex.\n" + idle, paneCommand: 'node', tools: [] }), true, 'prosa com "trust"');
});

test('reexecIfChanged: igual → same; quebrado → broken, avisa uma vez e não sai', () => {
  const d = tmp(); const f = join(d, 'x.mjs'); writeFileSync(f, 'export const a = 1;\n');
  const start = fingerprint([f]); const logs = [];
  assert.equal(reexecIfChanged({ files: [f], startFp: start, script: f, log: (m) => logs.push(m) }), 'same');
  writeFileSync(f, 'export const = ;\n');
  assert.equal(reexecIfChanged({ files: [f], startFp: start, script: f, log: (m) => logs.push(m) }), 'broken');
  assert.equal(reexecIfChanged({ files: [f], startFp: start, script: f, log: (m) => logs.push(m) }), 'broken');
  assert.equal(logs.length, 1); assert.match(logs[0], /não compila; sigo com o código antigo/);
  rmSync(d, { recursive: true });
});
