// test-env — carregado antes de cada teste (npm test e npm run test:coverage). Na sessão de um papel o ambiente traz FSD_STATE,
// FSD_RUNNER, FSD_AGENT… do time de verdade; os testes montam o próprio mundo e não podem ler nem gravar nele.
for (const k of Object.keys(process.env)) if (/^FSD_/.test(k) || k === 'GIT_CONFIG_GLOBAL') delete process.env[k];
