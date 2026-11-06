import { lstat } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'

import type {
  ChangesResponse,
  DiffResponse,
  FileEntry,
} from '../../src/shared/files'
import { readFileResponse, safePath } from './file-access'
import { readGitDiff } from './git-diff'
import { branchChanges } from './repository-changes'
import { Git, zeroPaths } from './git'

export interface RepositorySnapshot {
  entries: FileEntry[]
  changes: ChangesResponse
}

export class Repository {
  readonly git: Git
  private readonly warn: (message: string) => void
  constructor(root: string, warn: (message: string) => void = () => {}) {
    this.git = new Git(root)
    this.warn = warn
  }

  async snapshot(defaultBranch: string): Promise<RepositorySnapshot> {
    const changes = await this.changes(defaultBranch)
    const marks = new Map(changes.files.map((file) => [file.path, file.change]))
    const paths = zeroPaths(
      await this.git.run([
        'ls-files',
        '--cached',
        '--others',
        '--exclude-standard',
        '-z',
      ]),
    )
    const entries = new Map<string, FileEntry>()
    await Promise.all(
      paths.map(async (path) => {
        try {
          safePath(path)
          const info = await lstat(join(this.git.root, path))
          entries.set(path, {
            path,
            name: basename(path),
            kind: info.isDirectory() ? 'directory' : 'file',
            change: marks.get(path) ?? null,
          })
          for (
            let parent = dirname(path);
            parent !== '.';
            parent = dirname(parent)
          ) {
            entries.set(parent, {
              path: parent,
              name: basename(parent),
              kind: 'directory',
              change: null,
            })
          }
        } catch {
          /* Deleted and unavailable paths are absent from the full tree. */
        }
      }),
    )
    return {
      entries: [...entries.values()].sort((a, b) =>
        a.path.localeCompare(b.path, 'en'),
      ),
      changes,
    }
  }

  changes(defaultBranch: string): Promise<ChangesResponse> {
    return branchChanges(this.git, defaultBranch, this.warn)
  }

  read(path: string, maxBytes: number) {
    return readFileResponse(this.git.root, path, maxBytes)
  }

  diff(path: string, defaultBranch: string): Promise<DiffResponse> {
    return readGitDiff(this.git, path, defaultBranch)
  }
}
