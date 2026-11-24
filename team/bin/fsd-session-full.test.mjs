// fsd-session por inteiro: pelo wrapper (container) e direto; ligar, turno, parar, aposentar e religar, com cada resposta do claude.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const BIN = dirname(fileURLToPath(import.meta.url)); process.env.FSD_STATE = mkdtempSync(join(tmpdir(), 'sf-')); const S = await import('./fsd-session.mjs');
const exe = (f, b) => writeFileSync(f, `#!/bin/sh\n${b}\n`, { mode: 0o755 });
const U = (n) => `${String(n).repeat(8)}-1111-4111-8111-111111111111`;
// sudo falso: registra a chamada e o prompt; $W/agents-<papel> é a lista; start/resume respondem com $W/bg.
function via({ root = true, body = '' } = {}) {
  const w = mkdtempSync(join(tmpdir(), 'sv-')), st = join(w, 'st'); mkdirSync(join(st, 'dispatch'), { recursive: true }); for (const r of S.ROLES) mkdirSync(join(w, 'root', r), { recursive: true });
  exe(join(w, 'sudo'), `printf '%s\\n' "$*" >> ${w}/calls\nrole=\${3#fsd-}; shift 4\n${body}\ncase "$1" in agents) cat ${w}/agents-$role 2>/dev/null || echo "[]";; stop) ;; start) stat -c '%a' "$2" "$(dirname "$2")" >> ${w}/modes; cp "$2" ${w}/prompt; cat ${w}/bg;; resume) stat -c '%a' "$3" "$(dirname "$3")" >> ${w}/modes; cp "$3" ${w}/prompt; cat ${w}/bg; exit $(cat ${w}/rc 2>/dev/null || echo 0);; esac`);
  writeFileSync(join(w, 'bg'), 'backgrounded · abcdef12 · x'); const live = (r, o = {}) => writeFileSync(join(w, `agents-${r}`), JSON.stringify([{ id: 'abcdef12', kind: 'background', name: r, sessionId: U(1), ...o }]));
  const run = (args, env = {}) => spawnSync(join(BIN, 'fsd-session'), args, { encoding: 'utf8', env: { ...process.env, FSD_STATE: st, FSD_STATE_ROOT: root ? join(w, 'root') : '', FSD_SESSION_VIA: 'sudo', FSD_SESSION_POLL_MS: '1', FSD_SESSION_ALLOW_UNISOLATED: '', PATH: `${w}:${process.env.PATH}`, ...env } });
  return { w, run, live, stored: (v) => (v ? writeFileSync(join(st, 'dispatch', 'sessions.json'), JSON.stringify(v)) : JSON.parse(readFileSync(join(st, 'dispatch', 'sessions.json'), 'utf8'))), calls: () => readFileSync(join(w, 'calls'), 'utf8').trim().split('\n').map((l) => l.replace('-n -u fsd-', '').replace('/usr/local/sbin/fsd-session-exec ', '')), file: (f) => readFileSync(join(w, f), 'utf8').trim(), put: (f, v) => writeFileSync(join(w, f), v) };
}
const ok = (r, re) => { assert.equal(r.status, 0, r.stdout + r.stderr); if (re) assert.match(r.stdout, re); };
const no = (r, code, re) => { assert.equal(r.status, code, r.stdout + r.stderr); assert.match(r.stdout, re); };
const off = (x) => writeFileSync(join(x.w, 'agents-mel'), '[]');
test('wrapper: a new session starts by the file of the prompt, closed to others, and the file is gone after', () => {
  for (const [root, modes] of [[true, '660\n770'], [false, '644\n711']]) {
    const x = via({ root, body: `[ "$1" = start ] && echo '[{"id":"abcdef12","kind":"background","name":"mel","sessionId":"${U(1)}"}]' > ${'$(dirname "$0")'}/agents-mel` });
    ok(x.run(['turn', 'mel', 'faça X']), /mel com turno novo na conversa 11111111/); assert.equal(x.file('prompt'), 'faça X'); assert.equal(x.file('modes'), modes); assert.equal(x.stored().mel.sessionId, U(1)); assert.equal(x.stored().mel.active, true);
    assert.deepEqual(readdirSync(join(x.w, 'root', 'mel')), []); assert.match(x.calls().find((c) => / start /.test(c)), /^mel start /);
  }
});
test('wrapper: idle → stop and resume; off → resume; working → refused', () => {
  const a = via(); a.stored({ mel: { sessionId: U(1), active: true } }); a.live('mel'); ok(a.run(['turn', 'mel', 'mais'])); assert.match(a.calls().find((c) => / stop /.test(c)), /mel stop abcdef12/); assert.match(a.calls().find((c) => / resume /.test(c)), new RegExp(`mel resume ${U(1)} `)); assert.equal(a.stored().mel.lastSessionId, U(1));
  const b = via({ body: `[ "$1" = resume ] && echo '[{"id":"abcdef12","kind":"background","sessionId":"${U(2)}"}]' > ${'$(dirname "$0")'}/agents-mel` }); b.stored({ mel: { sessionId: U(1) } }); off(b); ok(b.run(['turn', 'mel', 'oi'])); assert.ok(!b.calls().some((c) => / stop /.test(c))); assert.equal(b.stored().mel.sessionId, U(2));
  const c = via(); c.stored({ mel: { sessionId: U(1) } }); c.live('mel'); mkdirSync(join(c.w, 'root', 'mel', 'session-state')); writeFileSync(join(c.w, 'root', 'mel', 'session-state', 'mel.json'), '{"state":"working"}'); no(c.run(['turn', 'mel', 'oi']), 1, /trabalhando/);
});
test('the list of sessions cannot be read: nothing is opened, for every command and every way it fails', () => {
  const ways = { exit: 'echo "sem login" >&2; exit 1', said: 'echo "na saída"; exit 1', mute: 'exit 7', lixo: 'echo lixo; exit 0', obj: 'echo "{}"; exit 0', nulo: 'echo null; exit 0' };
  for (const [k, b] of Object.entries(ways)) for (const a of [['turn', 'mel', 'x'], ['start', 'mel', 'x'], ['stop', 'mel'], ['retire', 'mel'], ['boot'], ['status']]) {
    const x = via({ body: `[ "$1" = agents ] && { ${b}; }` }); x.stored({ mel: { sessionId: U(1), active: true } }); const r = x.run(a); assert.notEqual(r.status, 0, `${k} ${a}`); assert.match(r.stdout, /não consegui ler as sessões de kevin: /); assert.ok(!x.calls().some((c) => / (start|resume|stop) /.test(c))); assert.deepEqual(x.stored(), { mel: { sessionId: U(1), active: true } });
  }
  assert.deepEqual(S.liveAgents({ claude: 'true' }), []); assert.throws(() => S.liveAgents({ claude: '/nao/existe' }), /ENOENT/); assert.throws(() => S.liveAgents({ claude: 'false', cwd: '/' }), /exit 1/);
  const PATH = process.env.PATH, d = mkdtempSync(join(tmpdir(), 'cl-')); exe(join(d, 'claude'), 'echo "[]"'); process.env.PATH = `${d}:${PATH}`; const FC = process.env.FSD_CLAUDE; delete process.env.FSD_CLAUDE; try { assert.deepEqual(S.liveAgents(), []); assert.equal(S.stopSession('mel', 'a').status, 0); } finally { process.env.PATH = PATH; if (FC !== undefined) process.env.FSD_CLAUDE = FC; }
});
test('the conversation is gone: a turn opens a new one, boot forgets it; any other failure of claude is said with exit 4', () => {
  const gone = () => { const x = via({ body: `[ "$1" = start ] && echo '[{"id":"abcdef12","kind":"background","sessionId":"${U(3)}"}]' > ${'$(dirname "$0")'}/agents-mel` }); x.stored({ mel: { sessionId: U(1), active: true } }); x.put('bg', 'No conversation found with session ID'); x.put('rc', '1'); off(x); return x; };
  const t = gone(); t.put('bg', 'No conversation found · backgrounded · abcdef12 · x'); ok(t.run(['turn', 'mel', 'oi']), /a conversa 11111111 de mel sumiu; abrindo uma sessão nova/); assert.equal(t.stored().mel.sessionId, U(3)); assert.match(t.file('prompt'), /Sessão nova[\s\S]*oi/);
  const b = gone(); ok(b.run(['boot']), /boot religou mel/); assert.deepEqual(b.stored().mel, { active: false, lastSessionId: U(1) });
  const f = gone(); f.put('bg', 'quebrou feio\nresto'); no(f.run(['turn', 'mel', 'oi']), 4, /claude --bg falhou \(quebrou feio resto\)/);
});
test('claude does not say the id, or the session never shows up: exit 4, and a copy already up is stopped', () => {
  const x = via(); x.put('bg', 'nada'); no(x.run(['turn', 'mel', 'oi']), 4, /não disse o id da sessão de mel \(nada\)/); assert.ok(!x.calls().some((c) => / stop /.test(c)));
  const y = via(); off(y); no(y.run(['turn', 'mel', 'oi']), 4, /não disse o id/); assert.match(y.calls().at(-1), /mel stop abcdef12/);
});
test('stop, retire, boot and status by the wrapper; a new day reads the handoff first', () => {
  const x = via(); x.stored({ mel: { sessionId: U(1), active: true } }); x.live('mel'); ok(x.run(['stop', 'mel']), /mel parado/); assert.equal(x.stored().mel.active, false); assert.match(x.calls().at(-1), /mel stop abcdef12/);
  const none = via(); ok(none.run(['stop', 'bob']), /bob parado/); ok(none.run(['retire', 'kevin'])); assert.equal(none.stored().kevin.lastSessionId, null); ok(none.run(['boot']), /religou ninguém/);
  const r = via({ body: `[ "$1" = start ] && echo '[{"id":"abcdef12","kind":"background","sessionId":"${U(4)}"}]' > ${'$(dirname "$0")'}/agents-mel` }); r.stored({ mel: { sessionId: U(1), active: true } }); r.live('mel'); ok(r.run(['retire', 'mel']), /aposentado/); assert.equal(r.stored().mel.lastSessionId, U(1)); assert.equal(r.stored().mel.sessionId, undefined); off(r); ok(r.run(['turn', 'mel', 'oi'])); assert.match(r.file('prompt'), /leia o handoff/);
  const s = via(); s.stored({ mel: { sessionId: U(1) }, bob: {} }); s.live('mel'); ok(s.run(['status']), /mel: idle \(11111111\)/); assert.match(s.run(['status']).stdout, /bob: off\n?/); assert.equal(JSON.parse(s.run(['status', '--json']).stdout).mel.state, 'idle');
});
test('a session that does not stop is not retired nor resumed on top', () => {
  for (const a of [['stop', 'mel'], ['retire', 'mel'], ['turn', 'mel', 'oi']]) { const x = via({ body: '[ "$1" = stop ] && { echo "não parou" >&2; exit 1; }' }); x.stored({ mel: { sessionId: U(1), active: true } }); x.live('mel'); const r = x.run(a); assert.equal(r.status, 4, `${a}: ${r.stdout}`); assert.match(r.stdout, /não parou/); assert.equal(x.stored().mel.active, true); assert.equal(x.stored().mel.sessionId, U(1)); assert.ok(!x.calls().some((c) => / resume /.test(c))); }
});
test('usage and isolation: bad arguments exit 2; without isolation no session starts', () => {
  for (const a of [[], ['nada'], ['turn'], ['turn', 'zeca', 'x'], ['turn', 'mel'], ['stop'], ['stop', 'zeca'], ['retire', 'zeca']]) no(via().run(a), 2, /uso: fsd-session/);
  for (const a of [['start', 'mel', 'x'], ['turn', 'mel', 'x'], ['boot']]) no(via().run(a, { FSD_SESSION_VIA: '' }), 1, /sem isolamento/);
});
test('plans: bgId, planTurn, planStop and planBoot in every state', () => {
  for (const [i, o] of [['backgrounded · abcdef12 · x', 'abcdef12'], ['', null], [undefined, null], ['backgrounded · zz', null]]) assert.equal(S.bgId(i), o);
  assert.deepEqual(S.planStop('mel', { st: { id: 'a' } }), [{ argv: ['stop', 'a'] }]); for (const st of [undefined, {}, null]) assert.deepEqual(S.planStop('mel', { st }), []);
  assert.match(S.planTurn('mel', 'p', { st: { state: 'working' } }).refused, /trabalhando/); assert.equal(S.planTurn('mel', 'p', { st: { state: 'idle', id: 'a' }, stored: {} }).steps.length, 2); assert.equal(S.planTurn('mel', 'p', { st: { state: 'idle' } }).steps.length, 1); assert.equal(S.planTurn('mel', 'p', {}).steps.length, 1);
  assert.deepEqual(S.planBoot(), []); for (const [active, state, sid, n] of [[true, 'off', 's', 1], [false, 'off', 's', 0], [true, 'idle', 's', 0], [true, 'off', undefined, 0]]) assert.equal(S.planBoot({ stored: { mel: { active, sessionId: sid } }, st: { mel: { state } } }).length, n);
  assert.deepEqual(Object.keys(S.status({})), S.ROLES); assert.equal(S.status({ agents: [{ sessionId: 's', kind: 'background', id: 'i' }], stored: { mel: { sessionId: 's' } } }).mel.state, 'idle'); rmSync(process.env.FSD_STATE, { recursive: true, force: true }); assert.deepEqual(S.loadStored(), {});
});
