import { basename, dirname } from 'node:path'

import type {
  ChangesResponse,
  DiffResponse,
  FileEntry,
} from '../../src/shared/files'
import { readFileResponse } from './file-access'
import { readGitDiff } from './git-diff'
import { branchChanges, changesFromIndex } from './repository-changes'
import { Git } from './git'
import { withGitIndex } from './git-index'

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
    const sha = await this.git.resolve(defaultBranch)
    return withGitIndex(
      this.git,
      async (index) => {
        const changes = await changesFromIndex(
          index,
          defaultBranch,
          sha,
          this.warn,
        )
        const marks = new Map(
          changes.files.map((file) => [file.path, file.change]),
        )
        const entries = new Map<string, FileEntry>()
        for (const [path, state] of index.states) {
          if (state.kind === 'absent') continue
          entries.set(path, {
            path,
            name: basename(path),
            kind: state.kind === 'directory' ? 'directory' : 'file',
            change:
              state.kind === 'directory' && !state.submodule
                ? null
                : (marks.get(path) ?? null),
          })
          for (
            let parent = dirname(path);
            parent !== '.';
            parent = dirname(parent)
          ) {
            if ((await index.classifier.classify(parent)).kind !== 'directory')
              break
            entries.set(parent, {
              path: parent,
              name: basename(parent),
              kind: 'directory',
              change: null,
            })
          }
        }
        return {
          entries: [...entries.values()].sort((a, b) =>
            a.path.localeCompare(b.path, 'en'),
          ),
          changes,
        }
      },
      sha,
    )
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
