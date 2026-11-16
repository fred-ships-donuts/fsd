import { test } from 'node:test';
import assert from 'node:assert/strict';
import { uiDialog } from './fsd-dialogs.mjs';

const onboarding = ['Teach auto mode about your environment?', '', '❯ 1. Yes', '  2. Not now', "  3. Don't show again"].join('\n');

test('o diálogo de onboarding do auto mode é reconhecido, com a tecla "nunca mais"', () => {
  assert.deepEqual(uiDialog(onboarding), { name: 'auto mode onboarding', key: '3' });
});

test('pedido de permissão de verdade não é diálogo da interface', () => {
  assert.equal(uiDialog('Do you want to proceed?\n❯ 1. Yes\n  2. No'), null);
  assert.equal(uiDialog(''), null);
  assert.equal(uiDialog(undefined), null);
});

test('a frase do título sozinha (citada, em diff ou em issue) não é o diálogo', () => {
  const title = 'Teach auto mode about your environment?';
  assert.equal(uiDialog(title), null);
  assert.equal(uiDialog(`● Li a #155: o diálogo "${title}" trava o painel.\n> ${title}\n│ > |`), null);
  assert.equal(uiDialog(`+ ${title}\n+ ❯ 1. Yes`), null, 'linhas de diff não valem');
  assert.equal(uiDialog(['❯ 1. Yes', "3. Don't show again"].join('\n')), null, 'opções sem o título');
});

test('o diálogo só conta no fim do painel', () => {
  const old = Array.from({ length: 20 }, (_, i) => `linha ${i}`);
  assert.equal(uiDialog([...onboarding.split('\n'), ...old].join('\n')), null, 'já rolou para cima');
  assert.deepEqual(uiDialog([...old, ...onboarding.split('\n')].join('\n')), { name: 'auto mode onboarding', key: '3' });
});

const trust = ['Quick safety check: Is this a project you created or one you trust? (Like your own code, a well-known open source project, or work from your team).', '', '❯ 1. Yes, I trust this folder', '  2. No, exit'].join('\n');
test('o diálogo de confiança da pasta é reconhecido; uma variante diferente não recebe tecla', () => {
  assert.deepEqual(uiDialog(trust), { name: 'trust folder', key: '1' });
  assert.equal(uiDialog(trust.replace('No, exit', 'Maybe later')), null, 'opções diferentes');
  assert.equal(uiDialog(trust.replace('Quick safety check', 'Another check')), null, 'título diferente');
  assert.equal(uiDialog(trust.split('\n').slice(2).join('\n')), null, 'opções sem o título');
});
