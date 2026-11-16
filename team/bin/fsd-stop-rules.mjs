// fsd-stop-rules.mjs — as regras do hook Stop (fsd-stop-guard): o fim da última mensagem do agente pede algo ao autor? Puro, com teste.
//   lastMessageText(input, readFile)  a mensagem: input.last_assistant_message, senão os blocos de texto da última entrada `assistant` do transcript_path
//   tailOf(text)                      o fim: últimas 3 linhas não vazias, até 400 caracteres, sem marcas de markdown nem cercas de código
//   asksAuthor(tail, rules)           true: a última linha termina em "?", ou casa um padrão de redirects.json → stopAsks / authorAsks
import { readFileSync } from 'node:fs';

export function lastMessageText(input, readFile = (p) => readFileSync(p, 'utf8')) {
  if (typeof input?.last_assistant_message === 'string' && input.last_assistant_message.trim()) return input.last_assistant_message;
  const path = input?.transcript_path; if (typeof path !== 'string' || !path) return '';
  let lines; try { lines = readFile(path).split('\n'); } catch { return ''; }
  for (let i = lines.length - 1; i >= 0; i--) {
    let e; try { e = JSON.parse(lines[i]); } catch { continue; }
    if (e?.type !== 'assistant') continue;
    const c = e.message?.content;
    const text = typeof c === 'string' ? c : Array.isArray(c) ? c.filter((b) => b?.type === 'text' && typeof b.text === 'string').map((b) => b.text).join('\n') : '';
    if (text.trim()) return text;   // a entrada só com tool_use não é a mensagem final: segue para a anterior
  }
  return '';
}

export function tailOf(text) {
  const lines = String(text || '').split('\n').filter((l) => !/^\s*```/.test(l)).map((l) => l.replace(/[*_`#>]+/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
  return lines.slice(-3).join('\n').slice(-400);
}

export function asksAuthor(tail, rules = {}) {
  const lines = String(tail || '').split('\n').filter((l) => l.trim());
  if (!lines.length) return false;
  if (/\?$/.test(lines[lines.length - 1].replace(/[*_\s]+$/, ''))) return true;
  for (const p of [...(rules.stopAsks || []), ...(rules.authorAsks || [])]) { try { if (new RegExp(p, 'i').test(tail)) return true; } catch {} }
  return false;
}
