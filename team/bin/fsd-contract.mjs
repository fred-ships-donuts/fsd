// fsd-contract.mjs — contratos de entrega em JSON (F3.7). Sem E/S ao importar (os schemas são lidos sob demanda).
//   validate(schema, data)                  erros de JSON Schema (subconjunto: type, required, properties, additionalProperties,
//                                           enum, const, minLength, maxLength, minimum, pattern, items, minItems, uniqueItems)
//   checkDelivery(data, { acceptance })     schema do tipo + Definition of Done (x-dod) + rastreabilidade do aceite (x-trace)
//   loadSchema(kind) · KINDS
// x-dod: lista fixa do que é "pronto" para o tipo; a entrega traz dod: { <item>: true } para cada um (T3.7.4).
// x-trace: a entrega cita cada item numerado do aceite do card, de 1 a N, sem faltar nenhum (T3.7.5). N vem do card
// (acceptance = número de itens); sem o card, os itens têm de ir de 1 até o maior citado, sem buraco.
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'contracts');
export const KINDS = () => readdirSync(DIR).filter((f) => f.endsWith('.schema.json')).map((f) => f.replace('.schema.json', '')).sort();
export const loadSchema = (kind) => JSON.parse(readFileSync(join(DIR, `${kind}.schema.json`), 'utf8'));

const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v);
const isType = (v, t) => (Array.isArray(t) ? t : [t]).some((x) => x === typeOf(v) || (x === 'number' && typeof v === 'number'));
export function validate(schema, data, path = '$') {
  const e = [];
  if (schema.type && !isType(data, schema.type)) return [`${path}: esperava ${[].concat(schema.type).join('|')}, veio ${typeOf(data)}`];
  if ('const' in schema && data !== schema.const) e.push(`${path}: tem de ser ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(data)) e.push(`${path}: um de ${schema.enum.join(', ')} (veio ${JSON.stringify(data)})`);
  if (typeof data === 'string') {
    if (schema.minLength != null && data.trim().length < schema.minLength) e.push(`${path}: vazio ou curto demais (mínimo ${schema.minLength})`);
    if (schema.maxLength != null && data.length > schema.maxLength) e.push(`${path}: longo demais (máximo ${schema.maxLength})`);
    if (schema.pattern && !new RegExp(schema.pattern).test(data)) e.push(`${path}: formato inválido (${schema.pattern})`);
  }
  if (typeof data === 'number' && schema.minimum != null && data < schema.minimum) e.push(`${path}: mínimo ${schema.minimum}`);
  if (Array.isArray(data)) {
    if (schema.minItems != null && data.length < schema.minItems) e.push(`${path}: pelo menos ${schema.minItems} item(ns)`);
    if (schema.uniqueItems && new Set(data.map((x) => JSON.stringify(x))).size !== data.length) e.push(`${path}: itens repetidos`);
    if (schema.items) data.forEach((x, i) => e.push(...validate(schema.items, x, `${path}[${i}]`)));
  }
  if (typeOf(data) === 'object') {
    for (const k of schema.required || []) if (!(k in data)) e.push(`${path}.${k}: obrigatório`);
    for (const [k, v] of Object.entries(data)) {
      if (schema.properties?.[k]) e.push(...validate(schema.properties[k], v, `${path}.${k}`));
      else if (schema.additionalProperties === false) e.push(`${path}.${k}: campo desconhecido`);
    }
  }
  return e;
}
export function checkDelivery(data, { acceptance } = {}) {
  const kind = data?.kind;
  let schema; try { schema = loadSchema(kind); } catch { return { kind, errors: [`$.kind: tipo desconhecido ${JSON.stringify(kind)} (use: ${KINDS().join(', ')})`] }; }
  const errors = validate(schema, data);
  for (const item of schema['x-dod'] || []) if (data?.dod?.[item] !== true) errors.push(`$.dod.${item}: falta na Definition of Done de ${kind}`);
  if (schema['x-trace'] && Array.isArray(data?.acceptance)) {
    const cited = new Set(data.acceptance.map((a) => a?.item).filter(Number.isInteger));
    const n = Number.isInteger(acceptance) ? acceptance : Math.max(0, ...cited);
    for (let i = 1; i <= n; i++) if (!cited.has(i)) errors.push(`$.acceptance: falta o item ${i} do aceite`);
    for (const i of cited) if (i > n) errors.push(`$.acceptance: item ${i} não existe no aceite (o card tem ${n})`);
  }
  return { kind, errors };
}

// T3.7.3: os comandos do time exigem o JSON do contrato na sessão nova (FSD_RUNNER=session).
// requireDelivery lê o arquivo, valida (schema + DoD + aceite) e confere com o que o comando sabe (expect: pr, head, verdict).
// saveDelivery grava como o fsd-entrega ($FSD_STATE/entregas/<kind>/<card>-<hora>.json, 0600, atômico).
import { writeFileSync as _w, mkdirSync as _m, renameSync as _r, readFileSync as _rd } from 'node:fs';
export const sessionRunner = () => process.env.FSD_RUNNER === 'session';
export function requireDelivery({ kind, file, acceptance, expect = {}, fill = {} }) {
  if (!file) return { ok: false, errors: [`falta --entrega <arquivo.json> (contrato team/contracts/${kind}.schema.json; modelo: fsd-entrega modelo ${kind})`] };
  let data; try { data = JSON.parse(_rd(file, 'utf8')); } catch (e) { return { ok: false, errors: [`${file}: não é JSON válido (${String(e.message).split('\n')[0]})`] }; }
  for (const [k, v] of Object.entries(fill)) if (data[k] == null) data[k] = v;   // o que o comando preenche depois (ex.: o número do PR novo)
  const errors = [];
  if (data.kind !== kind) errors.push(`$.kind: este comando entrega ${kind} (veio ${JSON.stringify(data.kind)})`);
  else errors.push(...checkDelivery(data, { acceptance }).errors);
  for (const [k, v] of Object.entries(expect)) {
    if (v == null) continue;
    const ok = k === 'head' ? typeof data.head === 'string' && String(v).startsWith(data.head) : data[k] === v;
    if (!ok) errors.push(`$.${k}: tem de ser ${JSON.stringify(k === 'head' ? String(v).slice(0, 12) : v)} (o que este comando está entregando), veio ${JSON.stringify(data[k])}`);
  }
  return { ok: !errors.length, errors, data };
}
export function saveDelivery(data, stateDir = process.env.FSD_STATE || `${process.env.HOME}/.config/fsd-agents`) {
  const dir = join(stateDir, 'entregas', data.kind); _m(dir, { recursive: true });
  const out = join(dir, `${data.card ?? data.ref?.slice(1) ?? 'x'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`), tmp = `${out}.${process.pid}.tmp`;
  // Validação R1: no time nativo (FSD_STATE_ROOT) o grupo lê também (ACL da pasta do papel), para o supervisor conferir a entrega.
  _w(tmp, JSON.stringify(data, null, 1) + '\n', { mode: process.env.FSD_STATE_ROOT ? 0o660 : 0o600 }); _r(tmp, out); return out;
}
