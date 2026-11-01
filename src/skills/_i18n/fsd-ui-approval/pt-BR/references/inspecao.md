# Inspeção da tela

Como o inspetor observa a implementação. A régua de cada item está no [checklist](checklist.md); aqui está o
método, comum a todos os itens.

## A fonte do esperado

Em ordem, sem pular:

1. **O Work Item**: PRD, costura (`spec.md` ou `plan.md`) e critérios de aceite. O PRD prevalece sobre o
   protótipo
2. **O documento de comportamento do protótipo**: `docs/comportamento-prototipo/<tela>.md`, produzido pela
   skill `fsd-extracao-comportamento-prototipo`. Tem os mesmos 12 grupos do checklist e é a base dos itens
   8.2, 8.3 e 8.4 e do 12.1
3. **O checklist**, que vale mesmo quando as duas fontes acima não dizem nada: comportamento que nenhuma fonte
   define e que o checklist exige é Falha com `origem: prototipo`

Sem o documento do protótipo e com protótipo no Work Item, o item 8.4 não é verificável: pare e peça ao
usuário a extração (a skill de extração é um pedido à parte, esta skill não a executa). Não compare com o
protótipo de memória.

## O app

- **Esta skill não sobe a aplicação.** O usuário informa a URL de uma instância já em pé
- **Banco de dados.** Se a aplicação consulta banco, navegar nela dispara consultas, e a regra global
  `SQL_AUTORIZACAO_CODIGO` vale. Antes de navegar, pergunte se a instância é a dos dados que o usuário
  autorizou (ou usa dado simulado). Sem isso, não abra a tela
- **Perfis.** Um login por perfil do briefing, com a credencial lida de variável de ambiente ou de
  referência. Nunca peça nem registre o valor. Nada de `storageState`, cookie ou token salvo em disco
- **Massa de teste.** Gravar, excluir e confirmar só em dados que o usuário declarou como de teste. Sem
  essa declaração, não clique em ação que grava ou apaga: leia o fluxo no código e registre OK (código) com
  o motivo
- **Nada de git.** A skill escreve só em `[UI_DIR]`

## Driver de browser

1. **Playwright MCP** (tools `browser_*`) ⇒ preferido. Headless e isolado
2. **`playwright-cli`** ⇒ fallback
3. **Claude in Chrome** só se nenhum dos dois existir e o usuário concordar
4. Nenhum ⇒ pare e diga como configurar. Não confira a tela só pelo código: isso rebaixa todos os itens a OK
   (código) ou Não verificado

O **protótipo** é a exceção: segue a regra global `PROTOTIPO_NAVEGADOR`. Abra-o no Edge, em aba nova, só para
leitura. A implementação é inspecionada pelo driver acima.

Um browser, uma sessão por vez: as inspeções rodam em sequência.

## Provocar os estados

Estado que só aparece em condição especial se provoca, não se imagina:

| Estado | Como provocar |
|---|---|
| Carregando | Rota com atraso (3 s) na API da tela |
| Vazio | Filtro sem resultado; ou resposta simulada com lista vazia |
| Erro de API | Rota abortada ou resposta 500 simulada |
| Erro de regra | Resposta simulada com o código de erro do contrato |
| Offline | Emulação de offline do contexto do browser |
| Sessão expirada | Resposta 401 simulada |
| Texto longo | Dado simulado com 120 caracteres sem espaço |
| Movimento reduzido | Emulação da mídia `prefers-reduced-motion: reduce` |
| Rede lenta | Atraso em todas as respostas |

No Playwright MCP, use a ferramenta de código (`browser_run_code`) para `page.route`, `context.setOffline` e
`page.emulateMedia`. Simular resposta é leitura da interface: não altera o backend. Registre em `evidencia`
qual estado foi provocado e como.

## Zoom de 200% e larguras

O Playwright não dá zoom de página. Use o equivalente de reflow: viewport de **640 px** de largura sobre 1280
(WCAG 1.4.4) e **320 px** (1.4.10). Larguras do 7.1: 1440, 1280, 1024, 768 e 375.

## Medir contraste

Rode no contexto da página (`browser_evaluate` ou ferramenta equivalente). Devolve cada combinação distinta de
cor de texto, fundo efetivo e tamanho, com a razão. Texto com transparência não é mesclado: a razão é
aproximada, e a evidência diz isso.

```js
(() => {
  const lum = ([r, g, b]) => { const f = c => (c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const num = s => s.match(/[\d.]+/g).map(Number);
  const fundo = el => { for (let e = el; e; e = e.parentElement) {
    const n = num(getComputedStyle(e).backgroundColor); if ((n[3] ?? 1) === 1) return n.slice(0, 3); }
    return [255, 255, 255]; };
  const vistos = new Map();
  for (const el of document.querySelectorAll('body *')) {
    if (!el.getClientRects().length) continue;
    if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(el), fg = num(cs.color).slice(0, 3), bg = fundo(el);
    const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
    const razao = +((a + 0.05) / (b + 0.05)).toFixed(2);
    const px = parseFloat(cs.fontSize), grande = px >= 24 || (px >= 18.66 && +cs.fontWeight >= 700);
    const chave = `${cs.color}|${bg}|${px}|${cs.fontWeight}`;
    if (!vistos.has(chave)) vistos.set(chave, { texto: el.textContent.trim().slice(0, 30), cor: cs.color,
      fundo: `rgb(${bg})`, px, peso: cs.fontWeight, razao, minimo: grande ? 3 : 4.5, passa: razao >= (grande ? 3 : 4.5) });
  }
  return [...vistos.values()].sort((x, y) => x.razao - y.razao);
})()
```

Componentes de interface (borda de campo, ícone, foco) se medem pela mesma razão, contra o fundo adjacente,
com mínimo 3:1. O item 9.2 só é OK com a lista das combinações medidas e nenhuma abaixo do mínimo.

## Medir layout shift

```js
new Promise(res => { let cls = 0;
  new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) cls += e.value; }))
    .observe({ type: 'layout-shift', buffered: true });
  setTimeout(() => res(+cls.toFixed(3)), 3000); })
```

Rode logo após recarregar a tela. CLS ≤ 0,1 é o mínimo; o item pede "sem salto visível", e qualquer salto que a
captura mostre é Falha mesmo abaixo de 0,1.

## Evidência

- Captura em `[UI_DIR]/evidencias/<id>-<slug>.png` (por exemplo `4.2-vazio-navios.png`), nos pontos que provam.
  O caminho vai no campo `shot`
- Nunca capture credencial, token nem dado pessoal real. Dado pessoal na tela: recorte a captura ou use
  massa de teste
- Valores medidos entram no texto (a razão de contraste, a largura do alvo, a duração da transição), não só
  "ok"
- Reproduza uma segunda vez antes de registrar Falha. Não reproduziu, registre a Falha como intermitente na
  `evidencia`
