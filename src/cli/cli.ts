import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { installCommand } from './commands/install.js';
import { listCommand } from './commands/list.js';
import { uninstallCommand } from './commands/uninstall.js';
import { updateCommand } from './commands/update.js';
import { packageRoot } from './skills.js';

export function runCli(argv: string[]) {
  const { version } = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')) as { version: string };
  const program = new Command();

  program
    .name('fsd')
    .description('fred-ships-donuts CLI')
    .version(version);

  program.addCommand(installCommand);
  program.addCommand(listCommand);
  program.addCommand(updateCommand);
  program.addCommand(uninstallCommand);

  program.parseAsync(argv);
}
