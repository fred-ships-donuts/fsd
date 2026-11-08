import { existsSync } from 'node:fs';
import { configPath, readConfig, writeConfig } from '../core/config.js';
import { realEnv, type Env } from '../core/scope.js';
import { fetchLatestVersion, installLatest, isGlobalInstall, shouldCheck } from '../core/selfUpdate.js';
import { isNewer } from '../core/semver.js';
import { EXIT_FAILED } from '../exitCodes.js';
import type { WizardOptions } from '../ui/run.js';
import { consoleIo, type Io } from './io.js';

export interface InitDeps {
  isTTY: () => boolean;
  openWizard: (options: WizardOptions) => Promise<number>;
  globalInstall: () => boolean;
  fetchLatest: () => Promise<string>;
  installLatest: () => boolean;
  now: () => Date;
  env: Env;
}

const defaultDeps: InitDeps = {
  isTTY: () => Boolean(process.stdin.isTTY && process.stdout.isTTY),
  // Dynamic import: `fsd -v`, `-h` and `update` never load React.
  openWizard: async (options) => (await import('../ui/run.js')).runWizard(options),
  globalInstall: () => isGlobalInstall(),
  fetchLatest: () => fetchLatestVersion(2000),
  installLatest,
  now: () => new Date(),
  env: realEnv(),
};

// Auto-update before the menu (SPEC 7): short timeout, once per 24h, failures are silent. It never creates a file:
// the time of the check is kept in memory and saved with the preferences when the user confirms an install, or
// right away only when config.json already exists.
async function autoUpdate(version: string, io: Io, deps: InitDeps): Promise<WizardOptions> {
  const config = readConfig(deps.env);
  if (!shouldCheck({ autoUpdate: config.autoUpdate, lastUpdateCheck: config.lastUpdateCheck, now: deps.now(), globalInstall: deps.globalInstall() })) return {};
  try {
    const latest = await deps.fetchLatest();
    const checkedAt = deps.now().toISOString();
    if (existsSync(configPath(deps.env))) writeConfig({ ...config, lastUpdateCheck: checkedAt }, deps.env);
    if (isNewer(latest, version) && deps.installLatest()) io.out(`fsd ${latest} installed; it takes effect on the next run`);
    return { lastUpdateCheck: checkedAt };
  } catch {
    // Network or write failures never block the wizard.
    return {};
  }
}

// `fsd init`: the interactive wizard, after the auto-update.
export async function initCommand(version: string, io: Io = consoleIo, deps: InitDeps = defaultDeps): Promise<number> {
  if (!deps.isTTY()) {
    io.err('fsd init requires an interactive terminal');
    return EXIT_FAILED;
  }
  return deps.openWizard(await autoUpdate(version, io, deps));
}
