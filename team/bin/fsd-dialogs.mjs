// fsd-dialogs.mjs — diálogos da própria interface do Claude Code que NÃO são pedido de permissão e que o vigia dispensa sozinho.
// A lista e a tecla de cada um ficam aqui: um diálogo novo é uma linha em DIALOGS. Função pura, sem tmux.
//   import { uiDialog } from './fsd-dialogs.mjs'
//   uiDialog(painel) → { name, key } | null     painel = texto do painel (capture-pane -p)
// `all`: todos os padrões têm de casar, cada um numa linha inteira do fim do painel (título E opções): a frase do título sozinha,
// citada num texto, num diff ou na saída de um `gh issue view`, não é o diálogo e não pode receber tecla.
// `key` é a opção que o fecha para sempre ("Don't show again").
export const DIALOGS = [
  { name: 'auto mode onboarding', key: '3',
    all: [/^Teach auto mode about your environment\?$/, /^[❯>]?\s*1\. Yes$/, /^[❯>]?\s*3\. Don't show again$/] },
];
const TAIL = 14;   // as mesmas linhas que o classify() do vigia olha

export function uiDialog(pane) {
  const lines = String(pane ?? '').split('\n').map((l) => l.trim()).filter(Boolean).slice(-TAIL);
  const d = DIALOGS.find((x) => x.all.every((re) => lines.some((l) => re.test(l))));
  return d ? { name: d.name, key: d.key } : null;
}
