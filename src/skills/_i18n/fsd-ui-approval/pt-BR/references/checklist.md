# Checklist de interface

A régua da aprovação: 12 grupos, 66 itens, 20 bloqueantes (**B**). **Todos os 66 itens recebem status**, em toda
aprovação, para toda tela do escopo. Item sem linha em `itens.json` invalida a consolidação.

Este arquivo é a fonte dos IDs, dos itens bloqueantes e dos critérios: o `scripts/consolidar.py` lê as linhas
desta tabela. Não renumere nem reordene as linhas.

Como ler as colunas:

- **OK quando**: o critério que a implementação precisa cumprir. Cumprir parte dele não é OK
- **Como verificar**: o método mínimo. O inspetor pode ir além, nunca ficar aquém
  ([inspecao.md](inspecao.md))
- **N/A só quando**: a única justificativa aceita. Fora dela, o item se aplica e recebe OK, Falha ou Não
  verificado ([status-e-veredito.md](status-e-veredito.md#na))

Quando o item reúne várias partes (6.1: ordenação e filtros; 6.5: truncamento, números, cabeçalho, scroll), cada
parte que existe na tela precisa passar. Parte que a tela deveria ter e não tem é Falha.

## 1. Estados dos elementos

| ID | B | Item | OK quando | Como verificar | N/A só quando |
|---|---|---|---|---|---|
| 1.1 | B | Hover com mudança visível e cursor correto | Todo elemento interativo muda de aparência ao hover e o cursor é `pointer` em link, botão e linha clicável, `text` em campo, `not-allowed` em desabilitado | Hover em cada tipo de elemento interativo, com captura antes e depois; cursor por `getComputedStyle(el).cursor` | A tela não tem elemento interativo |
| 1.2 | B | Foco visível por teclado, sem foco preso | Tab percorre todos os interativos na ordem visual, cada parada tem indicador de foco visível (contraste ≥ 3:1 com o fundo) e Shift+Tab sai de todos; nada prende o foco fora de modal | Tab sequencial com captura em cada tipo de elemento; `outline` computado em `:focus-visible` | Nunca |
| 1.3 | | Active/pressed com feedback | Botão e controle clicável mostram estado pressionado (cor, sombra, escala) durante o clique | Mouse down sem soltar, captura, soltar; ou regra `:active` no código (OK (código)) | A tela não tem controle clicável |
| 1.4 | B | Disabled distinto, sem ação, com motivo quando não óbvio | Aparência distinta, nenhuma ação ao clicar nem ao Enter, `disabled` ou `aria-disabled` no DOM, e motivo visível (texto ou tooltip) quando a causa não é óbvia | Provocar a condição (formulário inválido, ponta da paginação, falta de permissão), clicar, Enter, ler o atributo | Nenhum controle da tela pode ficar desabilitado |
| 1.5 | | Selected, checked e expanded além da cor | Cada estado se distingue por forma, ícone, texto ou peso, e é exposto por `aria-selected`, `aria-checked`, `aria-expanded`, `aria-current` ou `aria-sort` | Alternar cada controle; snapshot de acessibilidade; captura em tons de cinza | A tela não tem controle com esses estados |
| 1.6 | B | Loading no elemento, com bloqueio de clique duplo | Ação assíncrona mostra loading no próprio elemento (botão em loading, skeleton) e o disparo repetido é bloqueado: um clique duplo gera uma só requisição | Atrasar a resposta (rota com delay), clicar duas vezes, contar as requisições | A tela não tem ação assíncrona nem carga de dados |

## 2. Botões e ações

| ID | B | Item | OK quando | Como verificar | N/A só quando |
|---|---|---|---|---|---|
| 2.1 | | Hierarquia primária, secundária e destrutiva | No máximo uma primária por região de decisão, secundárias visualmente subordinadas, destrutiva distinta (cor, ícone ou posição) e nunca com o estilo da primária | Captura da tela e dos modais; listar os botões por estilo | A tela não tem botão de ação |
| 2.2 | | Rótulos verbo + objeto, iguais ao sistema | Rótulo começa com verbo e diz o objeto ("Salvar armador"), sem "OK" ou "Sim" soltos; a mesma ação tem o mesmo rótulo em todo o sistema e no protótipo | Listar os rótulos e comparar com outras telas e com o documento do protótipo | A tela não tem botão de ação |
| 2.3 | | Ordem de Salvar e Cancelar | Ordem e posição seguem o padrão do sistema e são iguais em todo formulário e modal da tela | Comparar os formulários e modais da tela entre si e com o padrão do sistema | A tela não tem formulário nem modal de confirmação |
| 2.4 | B | Confirmação em ação destrutiva | Ação destrutiva ou irreversível pede confirmação que diz o que será afetado, o botão de confirmar leva o nome da ação e o foco inicial fica em Cancelar | Acionar só em massa de teste declarada; fora dela, ler o código (OK (código)) | A tela não tem ação destrutiva, nem por menu ou ícone |
| 2.5 | B | Feedback depois do clique | Toda ação do usuário gera resposta visível imediata: mudança de estado, mensagem, toast ou navegação | Acionar cada ação da tela e capturar o resultado | A tela não tem ação |
| 2.6 | | Área de clique e rótulo dos ícones | Botão só com ícone tem nome acessível e tooltip ou rótulo; o alvo tem ≥ 24 × 24 px CSS (ideal 44) | `getBoundingClientRect` dos botões de ícone; snapshot de acessibilidade | A tela não tem ícone interativo |

## 3. Formulários e entrada de dados

Busca e filtros são campos de entrada: o grupo se aplica a eles.

| ID | B | Item | OK quando | Como verificar | N/A só quando |
|---|---|---|---|---|---|
| 3.1 | B | Rótulos visíveis, obrigatório e opcional, `autocomplete` | Todo campo tem `label` visível associado (placeholder sozinho não conta), indicação consistente de obrigatório ou opcional e `autocomplete` adequado nos campos de login e dados pessoais | `label[for]`, `required`, `autocomplete` no DOM; digitar e ver se o rótulo permanece | A tela não tem campo de entrada |
| 3.2 | | Máscaras e formatos | Campo com formato (CPF/CNPJ, data, moeda, telefone, CEP) tem máscara, aceita colagem e envia o valor normalizado | Digitar valor válido, inválido e colado; ler o corpo da requisição | A tela não tem campo formatado |
| 3.3 | B | Validação com mensagem junto ao campo | Valida no momento certo (saída do campo ou envio, nunca a cada tecla), mostra texto ao lado do campo dizendo como corrigir, usa `aria-invalid` e `aria-describedby`, e leva o foco ao primeiro campo inválido no envio | Enviar vazio e inválido; ler os atributos; checar `document.activeElement` | Nenhum campo da tela tem regra de validação |
| 3.4 | B | Erros de regra de negócio pelo código estável | Erro de regra vindo da API é mapeado pelo código estável do contrato, não pelo texto, para mensagem clara no campo ou na tela; código desconhecido cai numa mensagem genérica acionável | Simular a resposta de erro com o código do contrato (rota com resposta simulada); ler o mapa de códigos no código | A tela não grava nem aplica regra de negócio |
| 3.5 | | Enter, Tab e Esc | Enter envia o formulário ou ativa a linha, Tab segue ordem lógica, Esc fecha overlay e cancela edição sem perda silenciosa | Testar as três teclas em cada formulário, overlay e linha | A tela não tem formulário nem overlay |
| 3.6 | | Campos dependentes | Trocar o campo pai limpa ou recarrega os filhos e invalida a seleção anterior; o filho fica desabilitado enquanto o pai está vazio | Trocar o pai com o filho preenchido | A tela não tem campos dependentes |
| 3.7 | | Aviso de alterações não salvas | Sair com edição pendente (menu, voltar, fechar modal, F5, fechar aba) avisa; sem edição, não avisa | Editar e tentar sair de cada forma | A tela não tem edição |
| 3.8 | | Select, autocomplete, datepicker e upload com teclado | Operável por teclado (setas, Enter, Esc, digitar para filtrar), com `role` e `aria-expanded` corretos, "sem resultados", loading e, no upload, progresso e erro | Operar cada controle só pelo teclado; forçar lista vazia | A tela não tem nenhum desses controles |

## 4. Feedback e estados do sistema

| ID | B | Item | OK quando | Como verificar | N/A só quando |
|---|---|---|---|---|---|
| 4.1 | B | Estado de carregamento | Carga inicial e recarga mostram skeleton ou spinner no lugar do conteúdo, sem tela em branco e sem salto de layout | Atrasar a resposta (rota com delay) e capturar | A tela não carrega dado remoto |
| 4.2 | B | Estado vazio com orientação ou ação | Lista ou consulta sem resultado diz o motivo e o que fazer (ajustar o filtro, criar o primeiro item) e oferece a ação permitida ao perfil | Forçar vazio: filtro sem resultado ou resposta vazia simulada | A tela não tem lista nem consulta |
| 4.3 | B | Estado de erro acionável | Falha da API mostra mensagem em linguagem de usuário, sem detalhe técnico, com ação ("Tentar novamente"), sem perder o que foi digitado, com `role="alert"` | Abortar a requisição ou simular 500 | A tela não faz chamada remota |
| 4.4 | | Sucesso confirmado | Gravação bem-sucedida confirma de forma discreta (toast, mensagem ou mudança visível) e leva ao estado seguinte | Gravar em massa de teste declarada; fora dela, ler o código (OK (código)) | A tela não grava |
| 4.5 | | Timeout, offline e sessão expirada | Timeout e offline mostram mensagem e permitem tentar de novo; sessão expirada (401) leva ao login e volta ao ponto de origem sem perder dado | Emular offline; resposta 401 simulada; atraso acima do timeout | A tela não faz chamada remota |
| 4.6 | | Toasts e banners | Posição consistente, duração suficiente para ler (≥ 5 s, erro não some sozinho), fechável por teclado, `role="status"` ou `"alert"`, sem cobrir ação | Disparar cada mensagem e medir a duração | A tela não exibe toast nem banner |

## 5. Navegação e orientação

| ID | B | Item | OK quando | Como verificar | N/A só quando |
|---|---|---|---|---|---|
| 5.1 | | Item ativo do menu e título corretos | O menu marca o item ativo (além da cor, com `aria-current`) e o título, o `<title>` e o breadcrumb batem com a tela | Navegar até a tela e conferir os quatro | Nunca |
| 5.2 | B | Voltar, F5 e deep link mantêm o contexto | A URL reflete a tela e o estado relevante (filtros, ordenação, página, aba, registro aberto); F5 e abrir a URL em outra aba reproduzem o mesmo estado; Voltar e Avançar restauram o contexto | Aplicar filtro, copiar a URL, abrir em aba nova, F5, Voltar | A tela não tem estado a preservar (justifique qual) |
| 5.3 | B | Modal e drawer | Abre com o foco dentro (título ou primeiro campo), prende o foco (Tab cíclico), fecha por X, Esc e clique fora (exceto com dado não salvo), devolve o foco ao elemento de origem, deixa o fundo inerte, com `role="dialog"`, `aria-modal` e `aria-labelledby` | Abrir, Tab 10 vezes, Esc, clique fora, conferir o foco ao fechar | A tela não tem modal, drawer nem popover modal |
| 5.4 | | Abas e acordeões preservam estado | Alternar preserva filtros, rolagem e dado digitado; expõe `role="tab"`, `aria-selected` e `aria-expanded`; setas navegam as abas | Alternar com estado preenchido | A tela não tem abas nem acordeões |
| 5.5 | | 404, 403 e rota sem permissão | Rota inexistente mostra 404 com caminho de volta; sem permissão mostra 403 ou redireciona com explicação, sem vazar dado; item de menu sem permissão não aparece | Abrir URL inexistente e URL de outro perfil | O usuário excluiu do escopo, registrado no briefing |
| 5.6 | | Itens e ações conforme o perfil | Cada perfil vê só os itens e ações permitidos; a ação sem permissão fica ausente ou desabilitada com motivo | Repetir a tela com cada perfil do briefing | O sistema tem um único perfil, confirmado no briefing |

## 6. Tabelas, listas e dados

| ID | B | Item | OK quando | Como verificar | N/A só quando |
|---|---|---|---|---|---|
| 6.1 | | Ordenação com indicador; filtros com aplicar, limpar e contador | Coluna ordenável mostra indicador de direção e `aria-sort`; filtros aplicam de forma previsível, oferecem "Limpar filtros" e mostram a contagem de filtros ativos | Ordenar cada coluna; aplicar vários filtros; limpar | A tela não tem ordenação nem filtro |
| 6.2 | | Busca com debounce e requisições canceladas | Busca remota espera uma pausa na digitação (300 a 500 ms) e descarta a requisição anterior, sem resposta velha sobrepor a nova; busca local responde na hora | Digitar rápido e contar as requisições | A tela não tem busca, ou ela é local e sem requisição (diga qual) |
| 6.3 | | Paginação com total e itens por página | Mostra o total de registros e o seletor de itens por página, indica a página atual (`aria-current`), desabilita anterior e próxima nas pontas e mantém ordenação e filtros ao paginar | Paginar com ordenação e filtro ativos | A lista não pagina por contrato (≤ tamanho de página garantido) |
| 6.4 | | Seleção de linhas e ações em lote | Seleção por linha e "selecionar todos" com contagem, estado indeterminado, ação em lote só com seleção e confirmação em lote destrutivo | Selecionar parte, todas e nenhuma | A tela não tem seleção de linhas |
| 6.5 | | Truncamento, números à direita, cabeçalho fixo, scroll horizontal | Texto truncado tem tooltip ou expansão com o texto completo; números e valores à direita (identificadores à esquerda); o cabeçalho permanece visível ao rolar tabela longa; o scroll horizontal fica no contêiner da tabela, com a primeira coluna identificável | Carregar dado longo e muitos registros; estreitar a janela | A tabela não tem texto longo, números nem rolagem (justifique por parte) |
| 6.6 | | Clique na linha sem conflito com ações internas | Clique na linha faz a ação principal; checkbox, menu e link internos não disparam a ação da linha; a linha clicável é alcançável por teclado com `role` adequado | Clicar em cada controle interno e na linha; Tab e Enter | A tela não tem linha clicável nem ação interna |
| 6.7 | B | Vazio, carregando e erro dentro da tabela | Os três estados aparecem dentro do contêiner da tabela, com o cabeçalho preservado, cada um com o comportamento de 4.1, 4.2 e 4.3 | Provocar os três estados | A tela não tem tabela nem lista |

## 7. Layout e responsividade

| ID | B | Item | OK quando | Como verificar | N/A só quando |
|---|---|---|---|---|---|
| 7.1 | | Breakpoints sem scroll horizontal indevido | Em 1440, 1280, 1024, 768 e 375 px não há scroll horizontal da página nem conteúdo cortado, e menu e ações se adaptam | Redimensionar; `scrollWidth > clientWidth`; capturar | O PRD declara a faixa de largura suportada (cite o trecho) |
| 7.2 | | Alinhamento, espaçamento e grid consistentes | Elementos equivalentes se alinham à grade e os espaçamentos vêm da escala do design system, sem valores soltos | Captura e `margin` e `padding` computados | Nunca |
| 7.3 | | Textos longos, quebra e overflow | Título, nome, e-mail e mensagem longos quebram ou truncam com tooltip, sem estourar o contêiner nem sobrepor | Carregar ou simular dado longo | Nunca |
| 7.4 | | Zoom de 200% sem perda de função | Com zoom de 200% (equivalente: viewport de 640 px de largura sobre 1280) e texto ampliado, tudo permanece visível e operável, sem rolagem em dois eixos; em 320 px o conteúdo reflui | Redimensionar para 640 e 320 px; percorrer o fluxo | Nunca |
| 7.5 | | Elementos fixos sem cobrir conteúdo | Cabeçalho, rodapé e barra de ação fixos não cobrem conteúdo nem o foco (`scroll-padding`), inclusive em 375 px e com zoom de 200% | Tab até o último item e rolar até o fim | A tela não tem elemento fixo |

## 8. Consistência visual

| ID | B | Item | OK quando | Como verificar | N/A só quando |
|---|---|---|---|---|---|
| 8.1 | | Cores, tipografia, espaçamento e ícones do design system | Os valores computados vêm dos tokens do design system, sem cor ou medida solta no código da tela; mesma família, escala tipográfica e conjunto de ícones | Estilos computados mais busca de valores literais no código da tela | Nunca. Sem design system definido, o item é Não verificado |
| 8.2 | | Componentes iguais com o mesmo comportamento | O mesmo componente (tabela, busca, painel, modal, select) tem a mesma aparência e o mesmo comportamento em todas as telas do escopo, e usa o componente compartilhado, sem cópia | Comparar as ocorrências lado a lado; buscar duplicatas no código | A tela é a única do escopo e não repete componente do sistema |
| 8.3 | | Terminologia igual à do protótipo e do legado | Termos iguais aos do protótipo, do glossário do PRD e do restante do sistema, sem sinônimo para o mesmo conceito | Comparar os textos da tela com o documento do protótipo (grupos 2 e 11) e com o PRD | Nunca |
| 8.4 | | Fidelidade ao protótipo navegável | Cada comportamento do documento do protótipo (estrutura, textos, estados, ações) existe igual na implementação; divergência é Falha com a linha do documento. Divergência que o PRD ou a costura determina é anotada e não é Falha | Percorrer o documento do protótipo grupo a grupo contra a tela | O Work Item não tem protótipo (confirmado no briefing) |

## 9. Acessibilidade

| ID | B | Item | OK quando | Como verificar | N/A só quando |
|---|---|---|---|---|---|
| 9.1 | B | Fluxo inteiro operável só por teclado, ordem de Tab lógica | Todo o fluxo (menus, overlays, tabelas, selects, upload) funciona sem mouse, a ordem de Tab segue a ordem visual, sem armadilha de foco | Executar o caminho feliz e os alternativos sem o mouse | Nunca |
| 9.2 | B | Contraste mínimo | Texto normal ≥ 4,5:1; texto grande (≥ 24 px, ou ≥ 18,66 px em negrito) ≥ 3:1; componentes de interface e foco ≥ 3:1; inclui placeholder, texto secundário, hover, badges e erro | Medir cor e fundo efetivo de cada combinação distinta ([inspecao.md](inspecao.md#medir-contraste)) e registrar as razões | Nunca |
| 9.3 | B | Informação nunca só por cor | Status, erro, seleção, ordenação e gráfico trazem texto, ícone ou forma além da cor | Capturar a tela em tons de cinza | Nunca |
| 9.4 | B | HTML semântico, `label`, `alt`, `aria-*` | Landmarks (`header`, `nav`, `main`), títulos em ordem, `th` com `scope`, `<button>` e `<a>` nos controles (nunca `div` clicável), `alt` em imagem (`alt=""` na decorativa), `aria-*` válidos e sem redundância | Snapshot de acessibilidade mais inspeção do DOM | Nunca |
| 9.5 | | Erros e toasts anunciados | Erro de validação, toast, resultado vazio, contagem de resultados e loading ficam em região `aria-live` ou `role="alert"` e `"status"` | Ler os atributos das regiões | A tela não tem nenhuma dessas mensagens |
| 9.6 | | `prefers-reduced-motion` respeitado | Com `prefers-reduced-motion: reduce`, as animações não essenciais são desativadas ou reduzidas | Emular a preferência; ou achar a regra nos estilos (OK (código)) | Os estilos computados da tela não têm `transition` nem `animation` |

## 10. Animações e microinterações

| ID | B | Item | OK quando | Como verificar | N/A só quando |
|---|---|---|---|---|---|
| 10.1 | | Duração e easing coerentes | Microinteração entre 100 e 300 ms, overlay até 500 ms, mesmo easing para o mesmo tipo de transição, sem animação decorativa longa | `transition-duration`, `animation-duration` e easing computados | Os estilos computados da tela não têm `transition` nem `animation` |
| 10.2 | | Sem layout shift nem piscadas no carregamento | Sem salto de conteúdo no carregamento (imagens com dimensão, skeleton do tamanho do conteúdo) e sem piscada de estado | Medir `layout-shift` com `PerformanceObserver`; gravar o carregamento | Nunca |
| 10.3 | | Animação interrompível e desativável | A animação não bloqueia a interação, pode ser interrompida (fechar durante a abertura), nada pisca mais de 3 vezes por segundo, e respeita o 9.6 | Interagir durante a transição | A tela não tem animação |

## 11. Conteúdo e microcopy

| ID | B | Item | OK quando | Como verificar | N/A só quando |
|---|---|---|---|---|---|
| 11.1 | | Mensagens claras, sem jargão nem código cru | Sem jargão técnico, sigla sem explicação, código de erro cru nem texto em outro idioma; tom único | Ler todos os textos da tela e das mensagens | Nunca |
| 11.2 | | Erro diz o que aconteceu e o que fazer | Toda mensagem de erro traz a causa em linguagem do usuário e a ação seguinte | Provocar cada erro da tela | A tela não tem mensagem de erro |
| 11.3 | | Datas, números, moeda e fuso | Data `dd/MM/aaaa`, hora `HH:mm`, números `1.234,56`, moeda `R$`, fuso explícito quando relevante, sem ISO cru | Conferir cada valor exibido | A tela não exibe data, número nem moeda |
| 11.4 | | Ortografia, acentuação e capitalização | Sem erro nos textos da tela e do código (placeholder, `aria-label`, `title`, mensagens); capitalização uniforme | Ler a tela e os textos no código | Nunca |

## 12. Fluxo, desempenho e segurança percebida

| ID | B | Item | OK quando | Como verificar | N/A só quando |
|---|---|---|---|---|---|
| 12.1 | B | Caminho feliz, alternativos e de erro de ponta a ponta | O caminho feliz termina sem erro; os alternativos (cancelar, voltar, vazio) e os de erro (falha da API, validação) foram percorridos até o fim, e a tela termina em estado coerente | Percorrer cada caminho do documento do protótipo e do PRD | Nunca |
| 12.2 | | Poucos cliques e prevenção de erro | A tarefa principal usa o número mínimo razoável de passos (contados e comparados com o protótipo) e o formulário previne erro (restringe, sugere, confirma) | Contar os passos da tarefa principal | Nunca |
| 12.3 | | Retomada de fluxo interrompido | Fluxo em etapas preserva o rascunho ao voltar, recarregar ou perder a sessão e permite retomar do ponto | Interromper no meio e voltar | O fluxo não tem etapas nem gravação |
| 12.4 | | Feedback em até 100 ms e rede lenta | Cada ação dá resposta visual em até 100 ms e, com rede lenta, nada fica sem indicação nem congela | Atrasar as respostas em 3 s e acionar cada ação | Nunca |
| 12.5 | | Dados sensíveis mascarados | CPF, CNPJ, telefone, e-mail, token e senha seguem a regra do produto (mascarados, revelados sob ação); senha em `type="password"`; nada sensível na URL, no console nem no armazenamento sem necessidade | Inspecionar tela, URL, console, rede e armazenamento | A tela não expõe dado sensível (liste o que ela expõe) |
