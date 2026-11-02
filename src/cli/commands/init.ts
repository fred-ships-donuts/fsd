import { readConfig, writeConfig } from '../config.js';
import { fetchLatestVersion, installLatest, isGlobalInstall, isNewer, shouldCheck } from '../selfUpdate.js';
import { consoleIo, type Io } from './update.js';

export interface InitDeps {
  isTTY: () => boolean;
  openWizard: () => Promise<number>;
}

// Auto-update before the menu (SPEC 7): short timeout, once per 24h, failures are silent.
async function autoUpdate(version: string, io: Io): Promise<void> {
  const config = readConfig();
  if (!shouldCheck({ autoUpdate: config.autoUpdate, lastUpdateCheck: config.lastUpdateCheck, now: new Date(), globalInstall: isGlobalInstall() })) return;
  try {
    const latest = await fetchLatestVersion(2000);
    writeConfig({ ...config, lastUpdateCheck: new Date().toISOString() });
    if (isNewer(latest, version) && installLatest()) io.out(`fsd ${latest} installed; it takes effect on the next run`);
  } catch {
    // Network or write failures never block the wizard.
  }
}

const defaultDeps: InitDeps = {
  isTTY: () => Boolean(process.stdin.isTTY && process.stdout.isTTY),
  // Dynamic import: `fsd -v`, `-h` and `update` never load React.
  openWizard: async () => (await import('../ui/run.js')).runWizard(),
};

export async function initCommand(version: string, io: Io = consoleIo, deps: InitDeps = defaultDeps): Promise<number> {
  if (!deps.isTTY()) {
    io.err('fsd init requires an interactive terminal');
    return 1;
  }
  await autoUpdate(version, io);
  return deps.openWizard();
}
