#!/usr/bin/env node
// fsd-profile.mjs <perfil/.claude.json> <repo> — primeira subida sem humano (#161): grava, de forma idempotente, o estado de
// onboarding e de confiança no .claude.json do perfil do agente: hasCompletedOnboarding e, por projeto, hasTrustDialogAccepted
// (o repo e .claude/worktrees/*). Só acrescenta: nunca desfaz uma chave que já existe. Sem mudança, não reescreve o arquivo.
import { readFileSync, writeFileSync, renameSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function trustedPaths(repo) {
  const w = join(repo, '.claude', 'worktrees'); let sub = [];
  try { sub = readdirSync(w, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => join(w, e.name)); } catch {}
  return [repo, ...sub];
}
// → { json, changed } (puro)
export function withFirstRun(json, paths, version) {
  const j = { ...json }; let changed = false;
  if (j.hasCompletedOnboarding !== true) { j.hasCompletedOnboarding = true; changed = true; }
  if (version && !j.lastOnboardingVersion) { j.lastOnboardingVersion = version; changed = true; }
  const projects = { ...(j.projects || {}) };
  for (const p of paths) if (projects[p]?.hasTrustDialogAccepted !== true) { projects[p] = { ...(projects[p] || {}), hasTrustDialogAccepted: true }; changed = true; }
  j.projects = projects;
  return { json: j, changed };
}
// → 'written' | 'current' | 'unreadable'. Roda só na subida do wrapper, antes de o claude abrir: o rename não disputa com ele reescrevendo
// o .claude.json. Worktrees criados depois ficam sem confiança até a próxima subida (o fsd-dev start não passa por aqui).
export function ensureFirstRun(file, repo, version) {
  let cur = {};
  if (existsSync(file)) { try { cur = JSON.parse(readFileSync(file, 'utf8')); } catch { return 'unreadable'; } }   // arquivo ilegível: não mexe
  const { json, changed } = withFirstRun(cur, trustedPaths(repo), version);
  if (!changed) return 'current';
  const t = `${file}.${process.pid}.tmp`; writeFileSync(t, JSON.stringify(json, null, 2) + '\n', { mode: 0o600 }); renameSync(t, file);
  return 'written';
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [file, repo, version] = process.argv.slice(2);
  if (!file || !repo) { console.error('uso: fsd-profile.mjs <.claude.json> <repo> [versão]'); process.exit(2); }
  const r = ensureFirstRun(file, repo, version); console.log(r); process.exit(r === 'unreadable' ? 1 : 0);
}
