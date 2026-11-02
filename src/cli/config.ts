import { readFileSync } from 'node:fs';
import { scopePaths, writeJsonAtomic, realEnv, type Env } from './fsdDir.js';

export interface Config {
  schema: 1;
  theme: string;
  autoUpdate: boolean;
  updateSkills: boolean;
  lastUpdateCheck?: string;
}

export const defaultConfig = (): Config => ({
  schema: 1,
  theme: 'donut',
  autoUpdate: true,
  updateSkills: false,
});

// Never throws: missing, unreadable or unknown-schema files give the defaults.
export function readConfig(env: Env = realEnv()): Config {
  try {
    const data = JSON.parse(readFileSync(scopePaths('global', env).config, 'utf8')) as Partial<Config>;
    if (data.schema !== 1) return defaultConfig();
    const base = defaultConfig();
    return {
      schema: 1,
      theme: typeof data.theme === 'string' ? data.theme : base.theme,
      autoUpdate: typeof data.autoUpdate === 'boolean' ? data.autoUpdate : base.autoUpdate,
      updateSkills: typeof data.updateSkills === 'boolean' ? data.updateSkills : base.updateSkills,
      ...(typeof data.lastUpdateCheck === 'string' ? { lastUpdateCheck: data.lastUpdateCheck } : {}),
    };
  } catch {
    return defaultConfig();
  }
}

// config.json exists only in the global scope (SPEC 8.2).
export function writeConfig(config: Config, env: Env = realEnv()): void {
  writeJsonAtomic(scopePaths('global', env).config, config);
}
