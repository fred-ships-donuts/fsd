// A10: só os Apps do time aprovam ou pedem mudança. O repositório é público; um usuário humano chamado fsd-mel não conta.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewState, isTeamBot, markBots, mergeGate, cardColumn, prFromGraphQL, prFromGh, STAGE } from './fsd-lib.mjs';

const rv = (login, state = 'APPROVED', extra = {}) => ({ id: `R_${login}_${state}`, state, author: { login, ...extra }, commit: { oid: 'abc' } });
const ci = () => ['build', 'test', 'paths', 'shellcheck'].map((name) => ({ name, status: 'COMPLETED', conclusion: 'SUCCESS', workflowName: 'regression' }));
const pr = (reviews) => ({ number: 7, state: 'OPEN', isDraft: false, baseRefName: 'develop', mergeable: 'MERGEABLE', headRefOid: 'abc', body: 'Closes #1', author: { login: 'app/fsd-stuart', is_bot: true }, reviews, statusCheckRollup: ci() });

test('isTeamBot: App of the team by flag, "[bot]" or "app/"; a user with the same name or another App does not count', () => {
  for (const a of [{ login: 'fsd-mel', bot: true }, { login: 'fsd-mel[bot]' }, { login: 'app/fsd-bob' }, { login: 'fsd-kevin', bot: true }]) assert.equal(isTeamBot(a), true, a.login);
  for (const a of [{ login: 'fsd-mel' }, { login: 'fsd-mel', bot: false }, { login: 'outsider', bot: true }, { login: 'dependabot[bot]' }, { login: 'fredericojacobi' }, null]) assert.equal(isTeamBot(a), false, a?.login);
});

test('third-party approvals do not count: a user named fsd-mel and a human reviewer', () => {
  const s = reviewState(pr([rv('fsd-mel', 'APPROVED', { bot: false }), rv('fredericojacobi'), rv('fsd-bob[bot]')]));
  assert.deepEqual(s.approvers, ['fsd-bob']);
  assert.match(mergeGate(pr([rv('fsd-mel', 'APPROVED', { bot: false }), rv('fsd-bob', 'APPROVED', { bot: false })])).fail.join(), /0\/2 aprovações/);
  assert.deepEqual(mergeGate(pr([rv('fsd-mel', 'APPROVED', { bot: true }), rv('fsd-bob', 'APPROVED', { bot: true })])).fail, []);
});

test('a third-party change request does not block either', () => {
  assert.deepEqual(reviewState(pr([rv('fsd-bob', 'CHANGES_REQUESTED', { bot: false })])).changes, []);
  assert.deepEqual(reviewState(pr([rv('fsd-bob', 'CHANGES_REQUESTED', { bot: true })])).changes, ['fsd-bob']);
});

test('markBots: one GraphQL query with an alias per PR marks author.bot by __typename; unknown reviews stay unmarked', () => {
  const prs = [pr([rv('fsd-mel'), rv('fsd-bob')]), { ...pr([]), number: 9 }];
  let asked = '';
  markBots(prs, (q) => { asked = q; return { data: { repository: { p7: { reviews: { nodes: [{ id: 'R_fsd-mel_APPROVED', author: { __typename: 'User' } }] } } } } }; });
  assert.match(asked, /p7:pullRequest\(number:7\)\{reviews\(last:100\)\{nodes\{id author\{__typename\}\}\}\}/);
  assert.doesNotMatch(asked, /p9:/);   // PR sem revisão não entra na consulta
  assert.equal(prs[0].reviews[0].author.bot, false);
  assert.equal(prs[0].reviews[1].author.bot, false);   // fora da resposta: não conta
  assert.deepEqual(reviewState(prs[0]).approvers, []);
  const one = pr([rv('fsd-mel')]);
  markBots(one, () => ({ data: { repository: { p7: { reviews: { nodes: [{ id: 'R_fsd-mel_APPROVED', author: { __typename: 'Bot' } }] } } } } }));
  assert.deepEqual(reviewState(one).approvers, ['fsd-mel']);
});

test('cardColumn: two approvals from users named like the bots stay In Review; from the Apps → Ready to Merge', () => {
  const node = (type) => ({ state: 'OPEN', headRefOid: 'abc', mergeable: 'MERGEABLE', author: { login: 'fsd-stuart' },
    reviews: { nodes: ['fsd-mel', 'fsd-bob'].map((login) => ({ author: { __typename: type, login }, state: 'APPROVED', commit: { oid: 'abc' } })) },
    commits: { nodes: [{ commit: { statusCheckRollup: { state: 'SUCCESS', contexts: { nodes: ci().map((c) => ({ ...c, checkSuite: { workflowRun: { workflow: { name: 'regression' } } } })) } } } }] } });
  assert.equal(cardColumn(prFromGraphQL(node('User'))), STAGE.review);
  assert.equal(cardColumn(prFromGraphQL(node('Bot'))), STAGE.mergeReady);
  assert.equal(cardColumn(prFromGh(pr([rv('fsd-mel', 'APPROVED', { bot: true }), rv('fsd-bob', 'APPROVED', { bot: true })]))), STAGE.mergeReady);
  assert.equal(cardColumn(prFromGh(pr([rv('fsd-mel'), rv('fsd-bob')]))), STAGE.review);
});
