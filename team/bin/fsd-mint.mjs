// fsd-mint.mjs — cunha o token de instalação de um GitHub App do time (o fsd-token e o fsd-broker usam). Sem E/S ao importar.
//   requestBody(cfg, name, scope)   o body do POST: { repositories: [repo], permissions } da tabela agents.json → tokens (F1.6)
//   mint({ cfg, name, scope, keyFile, api, timeoutMs })   → { token, expires_at, body } · erro com .code: 2 config · 3 rede · 1 GitHub
import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const fail = (code, message) => Object.assign(new Error(message), { code });
export function requestBody(cfg, name, scope) {
  const permissions = scope === 'org' ? cfg.tokens?.org : cfg.tokens?.repo?.[name];
  const repoName = String(process.env.FSD_REPO_SLUG || cfg.repo || '').split('/')[1];
  if (!permissions || !Object.keys(permissions).length || permissions.workflows) throw fail(2, `${name} sem permissões ${scope} válidas em agents.json → tokens (workflows nunca)`);
  if (!repoName) throw fail(2, 'agents.json sem "repo" (dono/nome)');
  return JSON.stringify({ repositories: [repoName], permissions });
}
export async function mint({ cfg, name, scope = 'repo', keyFile, api = process.env.FSD_GITHUB_API || 'https://api.github.com', timeoutMs = Number(process.env.FSD_TOKEN_TIMEOUT_MS) || 10000 }) {
  const agent = cfg.agents[name]; if (!agent) throw fail(2, `agente desconhecido "${name ?? ''}" (use: ${Object.keys(cfg.agents).join(', ')})`);
  const instId = scope === 'org' ? agent.org_installation_id : agent.installation_id;
  if (!instId) throw fail(2, `${name} sem ${scope === 'org' ? 'org_installation_id' : 'installation_id'} no agents.json`);
  const reqBody = requestBody(cfg, name, scope);
  const b64 = (s) => Buffer.from(s).toString('base64url'); const now = Math.floor(Date.now() / 1000);
  const head = `${b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64(JSON.stringify({ iat: now - 60, exp: now + 540, iss: String(agent.app_id) }))}`;
  const jwt = `${head}.${createSign('RSA-SHA256').update(head).sign(readFileSync(keyFile)).toString('base64url')}`;
  let r, data;
  try {
    r = await fetch(`${String(api).replace(/\/+$/, '')}/app/installations/${instId}/access_tokens`, { method: 'POST', body: reqBody, signal: AbortSignal.timeout(timeoutMs),
      headers: { Authorization: `Bearer ${jwt}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'User-Agent': 'fsd-token' } });
    data = await r.json();
  } catch (e) { throw fail(3, `GitHub sem resposta em ${timeoutMs / 1000}s (${e.name === 'TimeoutError' ? 'timeout' : e.message})`); }
  if (!r.ok) throw fail(1, `GitHub ${r.status}: ${data?.message}`);
  return { token: data.token, expires_at: data.expires_at, body: reqBody };
}
