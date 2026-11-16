// fsd-pane.mjs — o que o painel de um agente mostra, antes de o vigia digitar nele (fsd-watch → safeSend). Função pura, sem tmux.
//   import { paneState } from './fsd-pane.mjs'
//   paneState({ cmd, tail }) → 'shell' | 'dialog' | 'input' | 'clear'
//     cmd  = #{pane_current_command}; tail = as últimas linhas não vazias do painel (capture-pane -p).
export const SHELLS = ['bash', 'zsh', 'sh'];
export const DIALOG = /❯ 1\.|Do you want|Press Enter to continue|Do you trust|trust this folder/i;
// "> texto" ou "│ > texto │". Casa também uma citação markdown ("> texto") e o texto de exemplo apagado do Claude: o C-u nesses
// casos é inofensivo, então não aperte esta regex. As opções de diálogo ("❯ 1.") já saem antes, como 'dialog'.
export const INPUT_TEXT = /^[│|]?\s*[>❯]\s+[^\s│|]/;
const INPUT_LINES = 4;   // a caixa de entrada fica no fim do painel

export function paneState({ cmd = '', tail = [] }) {
  if (SHELLS.includes(String(cmd).trim())) return 'shell';
  if (tail.some((l) => DIALOG.test(l))) return 'dialog';
  if (tail.slice(-INPUT_LINES).some((l) => INPUT_TEXT.test(l.trim()))) return 'input';
  return 'clear';
}
