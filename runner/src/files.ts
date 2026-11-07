import { watch } from 'node:fs'

import type { RunnerFileEvent } from '../../src/shared/files'
import type {
  RunnerFileCommand,
  RunnerFileResponse,
} from '../../src/shared/runner-files'
import { FileAccessError } from './file-access'
import { splitFileReport } from './file-parts'
import { changesUpdated, treeUpdate } from './file-updates'
import type { Repository, RepositorySnapshot } from './repository'
import type { FileRevisions } from './state'

interface FileReporterOptions {
  revisions?: FileRevisions
  prepare?: (event: RunnerFileEvent) => RunnerFileEvent
  warn?: (message: string) => void
}

type ReportKind = 'files.snapshot' | 'changes.updated'

export class FileReporter {
  private readonly revisions: FileRevisions
  private previousTree: RepositorySnapshot | null = null
  private previousChanges: RepositorySnapshot | null = null
  private pending: Promise<void> = Promise.resolve()
  private readonly repository: Repository
  private readonly branch: string
  private readonly emit: (
    event: RunnerFileEvent,
    reportCommandId?: string,
  ) => Promise<void>
  private readonly prepare: (event: RunnerFileEvent) => RunnerFileEvent
  private readonly warn: (message: string) => void

  constructor(
    repository: Repository,
    branch: string,
    emit: (event: RunnerFileEvent, reportCommandId?: string) => Promise<void>,
    options: FileReporterOptions = {},
  ) {
    this.repository = repository
    this.branch = branch
    this.emit = emit
    this.revisions = { ...(options.revisions ?? { tree: 0, changes: 0 }) }
    this.prepare = options.prepare ?? ((event) => event)
    this.warn = options.warn ?? (() => {})
  }

  refresh(
    full = false,
    kind?: ReportKind,
    reportCommandId?: string,
  ): Promise<void> {
    this.pending = this.pending
      .catch(() => {})
      .then(() => this.scan(full, kind, reportCommandId))
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

  private async scan(
    full: boolean,
    kind?: ReportKind,
    reportCommandId?: string,
  ): Promise<void> {
    const current = await this.repository.snapshot(this.branch)
    const events: RunnerFileEvent[] = []
    if (kind !== 'changes.updated') {
      const update = treeUpdate(
        this.previousTree,
        current,
        this.revisions.tree + 1,
        full,
      )
      if (update) events.push(update)
    }
    if (
      kind !== 'files.snapshot' &&
      (full || changesUpdated(this.previousChanges, current))
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
      for (const [index, part] of parts.entries()) {
        await this.emit(
          part,
          index === parts.length - 1 ? reportCommandId : undefined,
        )
        if (part.type === 'files.snapshot')
          this.revisions.tree = part.tree.revision
        if (part.type === 'files.changed')
          this.revisions.tree = part.delta.revision
        if (part.type === 'changes.updated')
          this.revisions.changes = part.changes.revision
      }
    }
    if (kind !== 'changes.updated') this.previousTree = current
    if (kind !== 'files.snapshot') this.previousChanges = current
  }
}
