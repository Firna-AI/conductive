import { basename, dirname } from 'node:path'
import type { ChangesResponse } from '../../src/shared/generated/ChangesResponse'
import type { DiffResponse } from '../../src/shared/generated/DiffResponse'
import type { FileEntry } from '../../src/shared/generated/FileEntry'
import { checkpointFromIndex, type Checkpoint } from './checkpoint'
import { contextFolderFiles } from './context-folder'
import { readFileResponse } from './file-access'
import { readGitDiff } from './git-diff'
import { branchChanges, changesFromIndex } from './repository-changes'
import { Git } from './git'
import { withGitIndex } from './git-index'
import type { GitPathState } from './git-paths'
import { readIdentity } from './read-identity'
import { comparisonBase } from './comparison-base'

export interface RepositorySnapshot {
  entries: FileEntry[]
  changes: ChangesResponse
  identities: Checkpoint
  readIdentities: Map<string, string>
  baseCommit: string
}

export class Repository {
  readonly git: Git
  private readonly warn: (message: string) => void
  constructor(
    root: string,
    warn: (message: string) => void = () => {},
    signal?: AbortSignal,
  ) {
    this.git = new Git(root, {}, signal)
    this.warn = warn
  }

  async snapshot(defaultBranch: string): Promise<RepositorySnapshot> {
    const { branch, sha } = await comparisonBase(this.git, defaultBranch)
    return withGitIndex(
      this.git,
      async (index) => {
        const changes = await changesFromIndex(index, branch, sha, this.warn)
        const marks = new Map(
          changes.files.map((file) => [file.path, file.change]),
        )
        const entries = new Map<string, FileEntry>()
        const addEntry = async (path: string, state: GitPathState) => {
          if (state.kind === 'absent') return
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
        for (const [path, state] of index.states) await addEntry(path, state)
        for (const path of await contextFolderFiles(
          this.git,
          index.classifier,
          this.warn,
        ))
          await addEntry(path, await index.classifier.classify(path))
        const readIdentities = new Map<string, string>()
        for (const entry of entries.values()) {
          if (entry.kind === 'file')
            readIdentities.set(
              entry.path,
              await readIdentity(this.git.root, entry.path),
            )
        }
        return {
          entries: [...entries.values()].sort((a, b) =>
            a.path.localeCompare(b.path, 'en'),
          ),
          changes,
          identities: await checkpointFromIndex(index),
          readIdentities,
          baseCommit: sha,
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
