#!/usr/bin/env node
import './env.js';
import { Command } from 'commander';
import { normalizeArgs } from './args.js';
import { initCommand } from './commands/init.js';
import { linkSkillsCommand } from './commands/link.js';
import { taskListCommand, taskNewCommand } from './commands/task.js';
import { updateCliCommand, updateSkillsCommand } from './commands/update.js';
import { version } from './core/package.js';

// The `fsd` binary: translates the shortcuts, wires each command to commander and sets the exit code. No rules here.

type ForceOption = { force?: boolean };

function buildProgram(done: (code: number) => void): Command {
  const program = new Command('fsd')
    .description('Install, update and remove the Fred Ships Donuts skills')
    .version(version, '-v, --version', 'print the version')
    .helpOption('-h, --help', 'show help')
    .option('-u', 'shortcut for `update`')
    .option('-s', 'shortcut for `skill` (with update or link)')
    .option('-f', 'shortcut for `--force` (with update skill or link skill)')
    .showHelpAfterError('(run `fsd --help` for usage)')
    // Root options are read only before the command, so `fsd task new x -f` is not the root `-f`.
    .enablePositionalOptions();

  program.command('init').description('open the interactive wizard').action(async () => done(await initCommand(version)));

  const update = program.command('update').description('update the fsd CLI').action(async () => done(await updateCliCommand(version)));
  update
    .command('skill [name]')
    .description('update the installed skills (all, or only <name>)')
    .option('-f, --force', 'replace a skill of the same name that is in the way')
    .action(async (name: string | undefined, options: ForceOption) => done(await updateSkillsCommand(name, { force: options.force === true })));

  const link = program.command('link').description('link installed skills that have no link');
  link
    .command('skill [name]')
    .description('link the installed skills that have no link (all, or only <name>)')
    .option('-f, --force', 'replace a skill of the same name that is in the way')
    .action(async (name: string | undefined, options: ForceOption) => done(await linkSkillsCommand(name, { force: options.force === true })));

  const task = program.command('task').description('create, list and move the tasks of nook/ (project scope)');
  task
    .command('new')
    .argument('<title>', 'the task title (after `--` when it starts with -)')
    .description('create nook/bench/<slug>/plan.md')
    .action((title: string) => done(taskNewCommand(title)));
  task
    .command('list')
    .description('list the tasks of nook/bench and nook/rack')
    .option('--all', 'also list nook/fridge')
    .option('--json', 'print one JSON object (the format the agent reads)')
    .action((options: { all?: boolean; json?: boolean }) => done(taskListCommand({ all: options.all === true, json: options.json === true })));

  return program;
}

async function main(): Promise<void> {
  const normalized = normalizeArgs(process.argv.slice(2));
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
