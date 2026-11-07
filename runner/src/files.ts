import { watch } from 'node:fs'

import type { RunnerFileEvent, FileTreeChange } from '../../src/shared/files'
import type {
  RunnerFileCommand,
  RunnerFileResponse,
} from '../../src/shared/runner-files'
import { FileAccessError } from './file-access'
import { splitFileReport } from './file-parts'
import type { Repository, RepositorySnapshot } from './repository'
import type { FileRevisions } from './state'

interface FileReporterOptions {
  revisions?: FileRevisions
  prepare?: (event: RunnerFileEvent) => RunnerFileEvent
  warn?: (message: string) => void
}

export class FileReporter {
  private readonly revisions: FileRevisions
  private previous: RepositorySnapshot | null = null
  private pending: Promise<void> = Promise.resolve()
  private readonly repository: Repository
  private readonly branch: string
  private readonly emit: (event: RunnerFileEvent) => Promise<void>
  private readonly prepare: (event: RunnerFileEvent) => RunnerFileEvent
  private readonly warn: (message: string) => void

  constructor(
    repository: Repository,
    branch: string,
    emit: (event: RunnerFileEvent) => Promise<void>,
    options: FileReporterOptions = {},
  ) {
    this.repository = repository
    this.branch = branch
    this.emit = emit
    this.revisions = { ...(options.revisions ?? { tree: 0, changes: 0 }) }
    this.prepare = options.prepare ?? ((event) => event)
    this.warn = options.warn ?? (() => {})
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
    const contentChanged =
      this.previous === null ||
      current.identities.size !== this.previous.identities.size ||
      [...current.identities].some(
        ([path, identity]) => this.previous?.identities.get(path) !== identity,
      )
    const events: RunnerFileEvent[] = []
    if (full || this.previous === null) {
      events.push({
        type: 'files.snapshot',
        tree: {
          revision: this.revisions.tree + 1,
          partNumber: 1,
          partCount: 1,
          entries: current.entries,
        },
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
        if (
          JSON.stringify(previous.get(path)) !== JSON.stringify(entry) ||
          this.previous.identities.get(path) !== current.identities.get(path)
        )
          changes.push({ operation: 'upsert', entry })
      }
      if (changes.length)
        events.push({
          type: 'files.changed',
          delta: { revision: this.revisions.tree + 1, changes },
        })
    }
    if (
      full ||
      contentChanged ||
      this.previous?.baseCommit !== current.baseCommit ||
      JSON.stringify(this.previous?.changes) !== JSON.stringify(current.changes)
    ) {
      events.push({
        type: 'changes.updated',
        changes: {
          ...current.changes,
          revision: this.revisions.changes + 1,
          partNumber: 1,
          partCount: 1,
        },
      })
    }
    for (const event of events) {
      const parts = splitFileReport(this.prepare(event))
      if (parts === null) {
        this.warn(
          'The file report contains an entry that exceeds its byte limit.',
        )
        return
      }
      for (const part of parts) {
        await this.emit(part)
        if (part.type === 'files.snapshot')
          this.revisions.tree = part.tree.revision
        if (part.type === 'files.changed')
          this.revisions.tree = part.delta.revision
        if (part.type === 'changes.updated')
          this.revisions.changes = part.changes.revision
      }
    }
    this.previous = current
  }
}
