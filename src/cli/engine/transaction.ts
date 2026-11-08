import { basename, join } from 'node:path';
import { exists, missingAncestors } from '../core/fs.js';
import { journalPath, type Journal } from '../core/runJournal.js';
import type { Ops } from './ops.js';

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

  move(from: string, to: string): void {
    this.created(to, () => this.ops.move(from, to));
  }

  symlink(target: string, link: string): void {
    this.created(link, () => this.ops.symlink(target, link));
  }

  /** Creates every missing directory up to `target`, outermost first. */
  ensureDirs(target: string): void {
    for (const dir of missingAncestors(target)) this.mkdir(dir);
  }

  /** Moves what is at `path` into the run directory, where undo can put it back. */
  displace(path: string): void {
    const displaced = join(this.runDir, 'displaced');
    const backup = join(displaced, String(this.journal.displaced.length));
    if (!exists(displaced)) this.ops.mkdir(displaced);
    this.record((j) => j.displaced.push({ path, backup }));
    this.ops.move(path, backup);
  }

  /** Writes JSON files so that undo restores each to what it was (or removes it, when it did not exist). */
  writeJsonFiles(files: Array<[string, unknown]>): void {
    for (const [file] of files) {
      let backup: string | null = null;
      if (exists(file)) {
        backup = join(this.runDir, `backup-${basename(file)}`);
        this.ops.copyFile(file, backup);
      }
      this.record((j) => j.restore.push({ path: file, backup }));
    }
    for (const [file, data] of files) this.ops.writeJson(file, data);
  }

  /** The point of no return: from here on the run is finished, not undone. */
  commit(): void {
    this.record((j) => (j.committed = true));
  }

  // Records `path` as created by the run, then makes it.
  private created(path: string, make: () => void): void {
    this.record((j) => j.created.push(path));
    make();
  }

  private record(change: (journal: Journal) => void): void {
    change(this.journal);
    this.save();
  }
}
