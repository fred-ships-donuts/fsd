// fsd-dialogs.mjs — diálogos da própria interface do Claude Code que NÃO são pedido de permissão e que o vigia dispensa sozinho.
// A lista e a tecla de cada um ficam aqui: um diálogo novo é uma linha em DIALOGS. Função pura, sem tmux.
//   import { uiDialog } from './fsd-dialogs.mjs'
//   uiDialog(painel) → { name, key } | null     painel = texto do painel (capture-pane -p)
// `title` identifica o diálogo pelo título; `key` é a opção que o fecha para sempre ("Don't show again").
export const DIALOGS = [
  { name: 'auto mode onboarding', title: /Teach auto mode about your environment\?/, key: '3' },
];

export function uiDialog(pane) {
  const d = DIALOGS.find((x) => x.title.test(String(pane)));
  return d ? { name: d.name, key: d.key } : null;
}
