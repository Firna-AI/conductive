import { watch } from 'node:fs'

import type { FileEvent, FileTreeChange } from '../../src/shared/files'
import type {
  RunnerFileCommand,
  RunnerFileResponse,
} from '../../src/shared/runner-files'
import { FileAccessError } from './file-access'
import type { Repository, RepositorySnapshot } from './repository'

export class FileReporter {
  private revision = 0
  private previous: RepositorySnapshot | null = null
  private pending: Promise<void> = Promise.resolve()
  private readonly repository: Repository
  private readonly branch: string
  private readonly emit: (event: FileEvent) => Promise<void>

  constructor(
    repository: Repository,
    branch: string,
    emit: (event: FileEvent) => Promise<void>,
  ) {
    this.repository = repository
    this.branch = branch
    this.emit = emit
  }

  refresh(full = false): Promise<void> {
    this.pending = this.pending.catch(() => {}).then(() => this.scan(full))
    return this.pending
  }

  /** Linux recursive watching includes new directories, index writes, and refs. */
  watch(warn: (message: string) => void): () => void {
    let timer: ReturnType<typeof setTimeout> | undefined
    const watcher = watch(this.repository.git.root, { recursive: true }, () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        void this.refresh().catch(() =>
          warn('The file lists could not update.'),
        )
      }, 100)
    })
    watcher.on('error', () => warn('The repository watcher is unavailable.'))
    return () => {
      clearTimeout(timer)
      watcher.close()
    }
  }

  async request(command: RunnerFileCommand): Promise<RunnerFileResponse> {
    try {
      if (command.type === 'file.read') {
        return {
          type: 'file.read.result',
          requestId: command.requestId,
          result: {
            ok: true,
            file: await this.repository.read(command.path, command.maxBytes),
          },
        }
      }
      return {
        type: 'file.diff.result',
        requestId: command.requestId,
        result: {
          ok: true,
          diff: await this.repository.diff(command.path, command.defaultBranch),
        },
      }
    } catch (error) {
      return {
        type:
          command.type === 'file.read'
            ? 'file.read.result'
            : 'file.diff.result',
        requestId: command.requestId,
        result: {
          ok: false,
          error:
            error instanceof FileAccessError
              ? error.detail
              : {
                  code: 'file_unavailable',
                  message: 'The file cannot be read.',
                },
        },
      }
    }
  }

  private async scan(full: boolean): Promise<void> {
    const current = await this.repository.snapshot(this.branch)
    if (full || this.previous === null) {
      this.revision = 1
      await this.emit({
        type: 'files.snapshot',
        tree: { revision: this.revision, entries: current.entries },
      })
    } else {
      const previous = new Map(
        this.previous.entries.map((entry) => [entry.path, entry]),
      )
      const entries = new Map(
        current.entries.map((entry) => [entry.path, entry]),
      )
      const changes: FileTreeChange[] = []
      for (const [path] of previous)
        if (!entries.has(path)) changes.push({ operation: 'remove', path })
      for (const [path, entry] of entries) {
        if (JSON.stringify(previous.get(path)) !== JSON.stringify(entry))
          changes.push({ operation: 'upsert', entry })
      }
      if (changes.length)
        await this.emit({
          type: 'files.changed',
          delta: { revision: ++this.revision, changes },
        })
    }
    if (
      full ||
      JSON.stringify(this.previous?.changes) !== JSON.stringify(current.changes)
    ) {
      await this.emit({ type: 'changes.updated', changes: current.changes })
    }
    this.previous = current
  }
}
