// Semver 2.0.0 precedence (section 11); build metadata is ignored.
export function compareVersions(a: string, b: string): number {
  const parse = (version: string) => {
    const [core = '', pre] = version.split('+')[0]!.split(/-(.*)/s);
    return { core: core.split('.').map(Number), pre: pre ? pre.split('.') : [] };
  };
  const left = parse(a);
  const right = parse(b);

  for (let i = 0; i < 3; i++) {
    const diff = (left.core[i] ?? 0) - (right.core[i] ?? 0);
    if (diff !== 0) return Math.sign(diff);
  }

  if (left.pre.length === 0 || right.pre.length === 0) {
    return Math.sign(right.pre.length - left.pre.length);
  }

  for (let i = 0; i < Math.max(left.pre.length, right.pre.length); i++) {
    const x = left.pre[i];
    const y = right.pre[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const xNumeric = /^\d+$/.test(x);
    const yNumeric = /^\d+$/.test(y);
    if (xNumeric && yNumeric) {
      const diff = Number(x) - Number(y);
      if (diff !== 0) return Math.sign(diff);
    } else if (xNumeric !== yNumeric) {
      return xNumeric ? -1 : 1;
    } else if (x !== y) {
      return x < y ? -1 : 1;
    }
  }
  return 0;
}

export function isValidVersion(version: string | undefined): version is string {
  return version !== undefined && /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/.test(version);
}

export const isNewer = (latest: string, current: string): boolean => compareVersions(latest, current) > 0;
