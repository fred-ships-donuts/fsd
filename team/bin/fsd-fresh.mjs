// fsd-fresh.mjs — o detector de novidade do fsd-wait. Função pura, com o estado na própria instância.
//   const fresh = makeFresh({ now })   now = --now (dispara também com o que já existe)
//   fresh(chave, itens, formatar) → texto de formatar(novos) ou ''
// Na primeira leitura guarda a linha de base (a não ser com --now) e não dispara; depois só dispara com itens que não estavam nela.
export function makeFresh({ now = false } = {}) {
  const base = new Map();
  const fresh = (key, items, fmt) => {
    if (!base.has(key)) { base.set(key, new Set(now ? [] : items)); if (!now) return ''; }
    const seen = base.get(key); const nw = items.filter((i) => !seen.has(i));
    return nw.length ? fmt(nw) : '';
  };
  fresh.base = base;   // o caso "mine" do fsd-wait lê e regrava a linha de base
  return fresh;
}
