# Inspeção da tela

Como o inspetor observa a implementação. A régua de cada item está no [checklist](checklist.md); aqui está o
método, comum a todos os itens.

## A fonte do esperado

Em ordem, sem pular:

1. **O Work Item**: PRD, costura (`spec.md` ou `plan.md`) e critérios de aceite. O PRD prevalece sobre o
   protótipo
2. **O protótipo**: o próprio protótipo navegável, observado só para leitura no mesmo cenário, e o documento de
   comportamento dele quando houver ([abaixo](#o-documento-de-comportamento-do-protótipo)). É a base dos itens
   8.2, 8.3 e 8.4 e do 12.1
3. **O checklist**, que vale mesmo quando as duas fontes acima não dizem nada: comportamento que nenhuma fonte
   define e que o checklist exige é Falha com `origem: prototipo`

Sem o documento de comportamento e com protótipo navegável, nada se pergunta: o inspetor observa o protótipo
direto e extrai o comportamento esperado ao cruzar cada cenário, registrando no `cruzamento.md` o que o protótipo
mostra e faz. Nenhum documento à parte é produzido. O cruzamento visual e o comportamental rodam, e o 8.4 segue a
[regra de fechamento](#cruzar-protótipo--implementação) do cruzamento. Não compare com o protótipo de memória.

## O documento de comportamento do protótipo

**Opcional.** Escrito pelo usuário ou por outro fluxo, a partir do protótipo rodando com dados mock; esta skill
não depende de nenhuma skill ou ferramenta específica para produzi-lo. Caminho:
`docs/comportamento-prototipo/<tela>.md`. Formato:

- Os mesmos 12 grupos do [checklist](checklist.md), na mesma ordem e com os mesmos títulos
  (`## 1. Estados dos elementos` … `## 12. Fluxo, desempenho e segurança percebida`)
- Em cada grupo, o comportamento esperado do protótipo: estrutura, textos, estados, ações, feedback e
  transições, com o caminho de navegação que leva a cada um. Grupo que o protótipo não cobre diz isso
- O que os dados moldam (colunas, formatos, vazio, texto longo), nunca o conteúdo mock em si

O PRD prevalece sobre ele, como prevalece sobre o protótipo. Quando existe, ele guia a matriz de cenários e os
itens 8.2, 8.3, 8.4 e 12.1; o protótipo continua sendo observado em cada cenário.

## O app

- **Esta skill não sobe a aplicação.** O usuário informa a URL de uma instância já em pé
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

O **protótipo** é a exceção: só é observado, nunca alterado. Abra-o só para leitura numa aba ou
contexto de browser próprio (o mesmo driver, nunca a sessão logada da implementação), e nunca interaja de modo
que o altere. A implementação é inspecionada pelo driver acima. Os dois
ficam abertos ao mesmo tempo só para a captura lado a lado; a interação é em sequência.

Um browser, uma sessão por vez: as inspeções rodam em sequência.

## Cruzar protótipo × implementação

Uma análise visual e comportamental: o mesmo cenário roda nos dois lados e os dois resultados são postos lado
a lado. Sem protótipo não há cruzamento, mas a matriz do passo 1 ainda é montada e percorrida só na
implementação, como mapa de cobertura do checklist, e o `cruzamento.md` abre com "sem protótipo: nada foi
cruzado".

**1. Matriz de cenários.** Antes de cruzar, liste os cenários e grave em `cruzamento.md`. As fontes são o próprio protótipo, o documento de comportamento dele quando houver (seus 12 grupos), os
critérios de aceite do PRD e os estados do checklist. Mínimo:

| Eixo | Cenários |
|---|---|
| Estado | carga inicial, carregando, com dados, vazio, erro de API, erro de validação, erro de regra, sucesso, desabilitado, offline, sessão expirada, conflito de edição, atualização em tempo real |
| Interação | cada ação da tela, hover, foco (teclado), atalhos, abrir/fechar de overlays, ordenação, filtro, busca, paginação ou scroll infinito, seleção, arrastar e soltar, copiar/colar, upload/download, sair com alteração não salva |
| Dados | realistas, texto longo, muitos registros, zero e negativos, caracteres especiais |
| Viewport | 1440 e 375 px; some 1024 e 768 quando o protótipo se adapta; toque e paisagem em 375 |
| Preferência | cada tema que o produto oferece, `forced-colors`, `prefers-reduced-motion`, zoom de 200%, cada idioma suportado |
| Perfil | cada perfil cuja visão difere |
| Fluxo | caminho feliz, alternativos (cancelar, voltar, vazio), de erro, interrupção e retomada |

Cenário que o protótipo não alcança (ele não tem aquele estado) se registra como `lacuna-do-prototipo`, não
se pula. Célula que a tela não tem (sem troca de tema, um idioma só) fica de fora, com o motivo no
`cruzamento.md`.

**2. Cruzar cada cenário.** Ponha protótipo e implementação no mesmo estado, na mesma largura, cada um com os
seus dados (**mock no protótipo, reais na implementação**, um nunca no lugar do outro), e capture os dois: `evidencias/<cenário>-prototipo.png` e `evidencias/<cenário>-implementacao.png`.
Compare, nesta ordem:

- **Visual:** estrutura e ordem dos blocos; alinhamento e espaçamento; tipografia (família, tamanho, peso);
  cores; ícones; textos e rótulos; proporção e truncamento. Meça pelo estilo computado na implementação e a
  olho ou por medição no protótipo; diferença abaixo da tolerância do próprio protótipo (antialiasing, 1 px de
  renderização) não é divergência
- **Comportamental:** o que acontece no hover, clique, foco e teclado; o feedback e o tempo dele; transições e
  animação (duração, easing, o que se move); em que estado a tela fica depois da ação; navegação e URL; o que
  cada perfil enxerga

**3. Registrar cada divergência** em `cruzamento.md`: cenário, o que o protótipo mostra ou faz, o que a
implementação mostra ou faz, as duas capturas, o item do checklist que ela afeta e a classe:

| Classe | Quando | Efeito |
|---|---|---|
| `defeito` | a implementação se afasta do protótipo e nada determina isso | Falha no item 8.4 e no item específico, `origem: implementacao` |
| `intencional` | o PRD ou a costura determina a diferença (cite o trecho) | anotada na `evidencia`, não é Falha |
| `lacuna-do-prototipo` | o protótipo não define o comportamento, ou o define errado | cai no checklist; a Falha seria `origem: prototipo` |

**O protótipo roda com dados mock e a implementação roda com dados reais, vindos da API real.** Nomes, números, datas, quantidades e a ordem dos registros diferem entre
o protótipo e a aplicação real, e isso é esperado: nunca é divergência. Cruze o que os dados *moldam*, não os
dados em si: a estrutura e as colunas, o formato (data, moeda, número), o truncamento e a quebra, o estado que
cada tipo de dado produz (vazio, texto longo, muitos registros, erro, um valor fora do usual) e como a tela
reage a ele. Para comparar, ponha a implementação na situação equivalente, sempre com dado real (um registro do mesmo
tipo, um filtro que esvazia a lista, texto longo na `massa`); o mock do protótipo pode ser o único lugar onde
certa situação aparece, e isso o torna a referência do comportamento, não do conteúdo. Nunca simule a API para
a implementação mostrar os dados do protótipo.

Divergência de gosto, sem regra por trás, não é divergência: registre como observação. Reproduza a
divergência uma segunda vez antes de registrá-la como `defeito`.

**4. Fechar.** O item 8.4 só é OK com todo cenário cruzado e nenhum `defeito` aberto; a `evidencia` dele cita
o `cruzamento.md` e a contagem por classe. `defeito` aberto o torna Falha; sem `defeito` e com algum cenário
não cruzado, é Não verificado. Cenário não cruzado vai para "Fora da cobertura" do inspetor e para
`meta.limites`, nunca para OK.

## Provocar os estados

Estado que só aparece em condição especial se provoca, não se imagina, e **sempre contra a API real**:
nenhuma resposta é simulada, interceptada, abortada ou forjada, e nenhum servidor falso faz as vezes da API.
O estado é provocado pela aplicação real: filtros reais, entrada inválida real, sessões reais, dados reais na
`massa`. Condições do browser que não tocam no tráfego (offline, limitação de rede, mídia, viewport, idioma)
são permitidas:

| Estado | Como provocar |
|---|---|
| Carregando | Limitação de rede com 3 s de latência na API real |
| Vazio | Filtro sem resultado |
| Erro de API | Uma falha real: emulação de offline, URL de registro inexistente, ação que o perfil não pode fazer |
| Erro de regra | Dado real que quebra a regra na `massa` (por exemplo, registro duplicado), devolvendo o código de erro do contrato |
| Offline | Emulação de offline do contexto do browser |
| Sessão expirada | Limpar o cookie ou token de sessão no cliente; a API real responde 401 |
| Texto longo | Registro com 120 caracteres sem espaço criado na `massa` |
| Movimento reduzido | Emulação da mídia `prefers-reduced-motion: reduce` |
| Rede lenta | Limitação de rede (latência e banda) em todo o tráfego |
| Conflito de edição | Duas sessões reais editando o mesmo registro da `massa` |
| Atualização em tempo real | Uma segunda sessão real altera o dado, e a primeira recebe o push ou o polling |
| Muitos registros | O volume que existe na instância, ou criado na `massa` |
| Tema e cores forçadas | `page.emulateMedia` com `colorScheme: 'dark'` e com `forcedColors: 'active'`, ou a troca de tema do produto |
| Toque e orientação | Contexto novo com `hasTouch` e `isMobile`, viewport 375 × 667 e 667 × 375 |
| Idioma e fuso | Contexto novo com `locale` e `timezoneId`, ou a troca de idioma do produto |

No Playwright MCP, use a ferramenta de código (`browser_run_code`) para `context.setOffline`, limitação de
rede (Chrome DevTools Protocol `Network.emulateNetworkConditions`), `page.emulateMedia` e contexto novo
(`page.context().browser().newContext`); no contexto novo, entre de novo, nunca com estado salvo. **Nunca**
`page.route`, `route.fulfill`, `route.abort`, `page.routeWebSocket` ou qualquer outra interceptação da API.
Estado que a API real e a `massa` não produzem (falha que a API nunca devolve, volume que não existe) não se
simula: é OK (código) com o motivo, ou Não verificado. Estado simulado nunca vale como prova.
Registre em `evidencia` qual estado foi provocado e como.

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
