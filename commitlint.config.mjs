// Regra das mensagens de commit, a única fonte: o `fsd-pr open` e o CI (.github/workflows/commits.yml) usam este arquivo.
// Conventional Commits (config-conventional). Quando o trabalho vem de uma tarefa, FSD_ISSUE traz o número dela e o
// cabeçalho tem de terminar com (#n): `fix: wizard exits 1 after a failed run (#76)`. Sem tarefa, FSD_ISSUE fica vazio.
const issue = /^\d+$/.test(process.env.FSD_ISSUE ?? '') ? process.env.FSD_ISSUE : '';

export default {
  extends: ['@commitlint/config-conventional'],
  plugins: [{
    rules: {
      'fsd-task-ref': ({ header }, when, n) => [
        (header ?? '').endsWith(` (#${n})`),
        `com tarefa, o cabeçalho termina com " (#${n})"`,
      ],
    },
  }],
  rules: issue ? { 'fsd-task-ref': [2, 'always', issue] } : {},
};
