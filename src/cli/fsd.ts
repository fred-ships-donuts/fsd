#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { normalizeArgs } from './args.js';
import { initCommand } from './commands/init.js';
import { updateCliCommand, updateSkillsCommand } from './commands/update.js';

const { version } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { version: string };

function buildProgram(done: (code: number) => void): Command {
  const program = new Command('fsd')
    .description('Install, update and remove the Fred Ships Donuts skills')
    .version(version, '-v, --version', 'print the version')
    .helpOption('-h, --help', 'show help')
    .option('-u', 'shortcut for `update`')
    .option('-s', 'shortcut for `skill` (with update)')
    .showHelpAfterError('(run `fsd --help` for usage)');

  program.command('init').description('open the interactive wizard').action(async () => done(await initCommand(version)));

  const update = program.command('update').description('update the fsd CLI').action(async () => done(await updateCliCommand(version)));
  update
    .command('skill [name]')
    .description('update the installed skills (all, or only <name>)')
    .action((name: string | undefined) => done(updateSkillsCommand(name)));

  return program;
}

async function main(): Promise<void> {
  const raw = process.argv.slice(2);
  const normalized = normalizeArgs(raw);
  if ('error' in normalized) {
    console.error(`error: ${normalized.error}\n(run \`fsd --help\` for usage)`);
    process.exit(1);
  }

  let code = 0;
  const program = buildProgram((value) => (code = value));
  if (normalized.args.length === 0) {
    program.outputHelp();
    return;
  }
  await program.parseAsync(normalized.args, { from: 'user' });
  process.exitCode = code;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
