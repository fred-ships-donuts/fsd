import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The npm package this CLI ships in. src/cli/core/ and dist/cli/core/ both sit three levels below the package root.
export const packageRoot = fileURLToPath(new URL('../../../', import.meta.url));

export const packageName = 'fred-ships-donuts';

export const version: string = (JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')) as { version: string }).version;
