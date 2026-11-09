import { join } from 'node:path';
import { exists, FileChangedError, missingAncestors } from '../core/fs.js';
import { journalPath, type Journal } from '../core/runJournal.js';
import type { Ops } from './ops.js';
import { Stop } from './recovery.js';

// The changes of one run, each written to the journal before it is made (SPEC 6.9 rule 3), so a failure, a ctrl+c or a
// dead process can always be undone (engine/recovery.ts).
export class Transaction {
  constructor(
    private readonly ops: Ops,
    readonly runDir: string,
    readonly journal: Journal,
  ) {}

  get committed(): boolean {
    return this.journal.committed;
  }

  /** Writes the journal as it is. */
  save(): void {
    this.ops.writeJson(journalPath(this.runDir), this.journal);
  }

  mkdir(path: string): void {
    this.created(path, () => this.ops.mkdir(path));
  }

  copyDir(from: string, to: string): void {
    this.created(to, () => this.ops.copyDir(from, to));
  }

  /** Moves a staged copy (`from` is the run's own) to `to`; undo deletes `to`. */
  moveIn(from: string, to: string): void {
    this.created(to, () => this.ops.move(from, to));
  }

  /** Moves something that was already there; undo moves it back, only if `to` exists and `from` does not. */
  relocate(from: string, to: string): void {
    this.record((j) => j.actions.push({ kind: 'moved', from, to }));
    this.ops.rename(from, to);
  }

  symlink(target: string, link: string): void {
    this.created(link, () => this.ops.symlink(target, link));
  }

  /** Creates every missing directory up to `target`, outermost first; undo removes each one only if it is left empty. */
  ensureDirs(target: string): void {
    for (const path of missingAncestors(target)) {
      this.record((j) => j.actions.push({ kind: 'createdDir', path }));
      this.ops.mkdir(path);
    }
  }

  /** Moves what is at `path` into the run directory, where undo can put it back. */
  displace(path: string): void {
    const displaced = join(this.runDir, 'displaced');
    const backup = join(displaced, String(this.journal.actions.filter((a) => a.kind === 'displaced').length));
    if (!exists(displaced)) this.ops.mkdir(displaced);
    this.record((j) => j.actions.push({ kind: 'displaced', path, backup }));
    this.ops.move(path, backup);
  }

  /**
   * Writes text files so that undo restores each to what it was (or removes it, when it did not exist). Per file: copy
   * the original to `backup-<n>`, record the restore, then write; a death at any point leaves the original intact.
   * With `expected` (what Verify saw), a file edited since then stops the run as `changed`.
   */
  writeTextFiles(files: Array<{ path: string; content: string; expected?: string }>): void {
    for (const { path, content, expected } of files) {
      let backup: string | null = null;
      if (exists(path)) {
        backup = join(this.runDir, `backup-${this.journal.actions.length}`);
        this.ops.copyFile(path, backup);
      }
      this.record((j) => j.actions.push({ kind: 'restore', path, backup }));
      try {
        this.ops.writeText(path, content, expected === undefined ? undefined : { expected });
      } catch (error) {
        if (error instanceof FileChangedError) throw new Stop('changed', `${path} changed while writing, try again`);
        throw error;
      }
    }
  }

  writeJsonFiles(files: Array<[string, unknown]>): void {
    this.writeTextFiles(files.map(([path, data]) => ({ path, content: JSON.stringify(data, null, 2) + '\n' })));
  }

  /** The point of no return: from here on the run is finished, not undone. */
  commit(): void {
    this.record((j) => (j.committed = true));
  }

  // Records `path` as created by the run, then makes it.
  private created(path: string, make: () => void): void {
    this.record((j) => j.actions.push({ kind: 'created', path }));
    make();
  }

  private record(change: (journal: Journal) => void): void {
    change(this.journal);
    this.save();
  }
}
