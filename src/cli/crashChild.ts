// Test fixture: runs an install and kills itself in the middle (like a power cut), to test recovery.
import { planInstall } from './actions/install.js';
import { failingOps, realOps, type Ops } from './ops.js';
import { runPlan } from './run.js';

const [home, cwd, name, lang, killAt] = process.argv.slice(2) as [string, string, string, string, 'symlink' | 'move'];
const ops: Ops = { ...realOps, [killAt]: () => process.kill(process.pid, 'SIGKILL') };
void failingOps;
await runPlan(planInstall('global', [{ name, lang }], { home, cwd }, { ensureBase: true }), { ops });
