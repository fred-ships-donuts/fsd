// fsd-alert.mjs — o alerta ao autor (#143, S5 de #124). Sem efeitos ao importar; fsd-watch e o CLI fsd-alert usam.
//   sanitize(s, max)                  tira controle e quebra de linha, junta espaços, corta em max
//   resetTime(pane)                   texto depois de "resets at" / "limit will reset at" / "resets" (max 40), senão 'desconhecido'
//   shouldAlert(mem, agent, state)    dedupe: true uma vez por estado; clearAlert(mem, agent) libera o próximo alerta do mesmo estado
//   deliver({ agent, state, text, channels, log })
//        channels = { desktop: [{ name, send }], file, github }; cada send(msg) devolve true/false e nunca lança.
//        Desktop em ordem, o primeiro que entrega vale; o arquivo ALERT sempre; o GitHub só se nenhum desktop entregou.
//        Devolve a lista dos canais que entregaram.
export const sanitize = (s, max = 200) => String(s ?? '').replace(/[\u0000-\u001f\u007f-\u009f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max).trim();

export function resetTime(pane) {
  const m = /(?:limit will reset at|resets at|resets)\s*(.+)/i.exec(String(pane ?? ''));
  const t = m ? sanitize(m[1], 40) : '';
  return t || 'desconhecido';
}

export function shouldAlert(mem, agent, state) {
  const k = `alert:${agent}`;
  if (mem[k] === state) return false;
  mem[k] = state; return true;
}
export const clearAlert = (mem, agent) => { delete mem[`alert:${agent}`]; };

export function deliver({ agent, state, text, channels = {}, log = () => {} }) {
  const msg = { agent: sanitize(agent, 40), state: sanitize(state, 40), text: sanitize(text, 200) };
  const run = (name, send) => { try { return send(msg) === true; } catch { log(`${name}: falhou`); return false; } };
  const out = []; let desktop = false;
  for (const c of channels.desktop || []) { if (run(c.name, c.send)) { out.push(c.name); desktop = true; break; } }
  if (channels.file && run('file', channels.file)) out.push('file');
  if (!desktop && channels.github && run('github', channels.github)) out.push('github');
  return out;
}
