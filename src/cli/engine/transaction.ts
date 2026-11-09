import { join } from 'node:path';
import { exists, missingAncestors } from '../core/fs.js';
import { journalPath, type Action, type Journal } from '../core/runJournal.js';
import type { Ops } from './ops.js';

// The changes of one run, each written to the journal before it is made (SPEC 6.9 rule 3), so a failure, a ctrl+c or a
// dead process can always be undone (engine/recovery.ts), from the last change to the first.
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

  copyDir(from: string, to: string): void {
    this.record({ kind: 'created', path: to });
    this.ops.copyDir(from, to);
  }

  /** Moves a staging copy (made by this run) to `to`; undo removes `to`. */
  moveIn(from: string, to: string): void {
    this.record({ kind: 'created', path: to });
    this.ops.move(from, to);
  }

  /** Moves a real folder (the user's) to `to`; undo moves it back, never removes it. */
  relocate(from: string, to: string): void {
    this.record({ kind: 'moved', from, to });
    this.ops.rename(from, to);
  }

  symlink(target: string, link: string): void {
    this.record({ kind: 'created', path: link });
    this.ops.symlink(target, link);
  }

  /** Creates every missing directory up to `target`, outermost first; undo removes each one only if it is empty. */
  ensureDirs(target: string): void {
    for (const dir of missingAncestors(target)) {
      this.record({ kind: 'createdDir', path: dir });
      this.ops.mkdir(dir);
    }
  }

  /** Moves what is at `path` into the run directory, where undo can put it back. */
  displace(path: string): void {
    const displaced = join(this.runDir, 'displaced');
    const backup = join(displaced, String(this.journal.actions.length));
    if (!exists(displaced)) this.ops.mkdir(displaced);
    this.record({ kind: 'displaced', path, backup });
    this.ops.move(path, backup);
  }

  /**
   * Writes JSON files so that undo restores each to what it was (or removes it, when it did not exist). The originals
   * are copied to `backup-<n>` (n: the index of the file's action) and recorded before any file is written.
   */
  writeJsonFiles(files: Array<[string, unknown]>): void {
    this.backUp(files.map(([path]) => path));
    for (const [path, data] of files) this.ops.writeJson(path, data);
  }

  /** The same for text files; `expected` (the text the file held when planned) makes a change in between a FileChangedError. */
  writeTextFiles(files: Array<{ path: string; content: string; expected?: string | null }>): void {
    this.backUp(files.map((file) => file.path));
    for (const { path, content, expected } of files) this.ops.writeText(path, content, expected);
  }

  // Copy the original to `backup-<n>` first, then record the restore; the writes come after every file is recorded.
  private backUp(paths: string[]): void {
    for (const path of paths) {
      let backup: string | null = null;
      if (exists(path)) {
        backup = join(this.runDir, `backup-${this.journal.actions.length}`);
        this.ops.copyFile(path, backup);
      }
      this.record({ kind: 'restore', path, backup });
    }
  }

  /** The point of no return: from here on the run is finished, not undone. */
  commit(): void {
    this.journal.committed = true;
    try {
      this.save();
    } catch (error) {
      // Not written, so not committed: the run is still undone.
      this.journal.committed = false;
      throw error;
    }
  }

  private record(action: Action): void {
    this.journal.actions.push(action);
    this.save();
  }
}
