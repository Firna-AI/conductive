import { readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'

import type {
  RunnerImportAction,
  RunnerImportCommand,
  RunnerImportReply,
  RunnerImportResult,
} from '../../src/shared/runner-import.ts'
import { readRunnerImportCommand } from '../../src/shared/runner-import-read.ts'
import { receiveImportChunk } from './import-chunks'
import { ImportDiskError, preflightImport } from './import-disk'
import { importPendingPath } from './import-paths'
import { applyImport } from './import-restore'
import { ImportStorage, readImportJson, saveImportJson } from './import-storage'
import { SerialQueue } from './serial-queue'
import type { EventStore } from './state'
import type { ImportLfsTransport } from './import-lfs-transport'

export interface ImportReceiverOptions {
  workspaceId: string
  cwd: string
  home: string
  storageHome?: string
  store: EventStore
  now(): number
  warn(message: string): void
  refresh(): Promise<void>
  reply(reply: RunnerImportReply): void
  lfs?: ImportLfsTransport
  measureDisk?: (path: string) => Promise<{ bsize: bigint; bavail: bigint }>
}

export async function pendingImport(home: string): Promise<string | null> {
  try {
    return (await readFile(importPendingPath(home), 'utf8')).trim()
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
      return null
    throw error
  }
}

/** Import replies are private transport controls. Each ACK follows durable writes. */
export class ImportReceiver {
  private readonly queue = new SerialQueue()
  private controller: AbortController | null = null
  private readonly options: ImportReceiverOptions
  constructor(options: ImportReceiverOptions) {
    this.options = options
  }

  disconnect() {
    this.controller?.abort()
  }

  receive(value: RunnerImportCommand): Promise<void> {
    const command = readRunnerImportCommand(value)
    return this.queue.run(async () => {
      const storage = new ImportStorage(
        this.options.storageHome ?? this.options.home,
        command.activationId,
      )
      await storage.prepare()
      const controller = new AbortController()
      this.controller = controller
      let timer: ReturnType<typeof setTimeout> | undefined
      try {
        let result = await storage.receipt(command)
        if (!result) {
          const open =
            command.action.kind === 'open'
              ? command.action
              : readRunnerImportCommand(
                  await readImportJson(join(storage.directory, 'open')),
                ).action
          if (
            open.kind !== 'open' ||
            open.workspaceId !== this.options.workspaceId
          )
            throw new Error('The import workspace does not match.')
          if (this.options.now() >= open.deadlineAt)
            throw new Error('The import start deadline ended.')
          timer = setTimeout(
            () => controller.abort(),
            open.deadlineAt - this.options.now(),
          )
          if (
            (await pendingImport(
              this.options.storageHome ?? this.options.home,
            )) !== command.activationId &&
            !(await readImportJson(join(storage.directory, 'finished')))
          )
            throw new Error('The import activation is not current.')
          result = await this.apply(storage, command, open, controller.signal)
          controller.signal.throwIfAborted()
          await storage.remember(command, result)
        }
        this.options.reply({
          type: 'import.result',
          commandId: command.commandId,
          activationId: command.activationId,
          epoch: command.epoch,
          connectionId: command.connectionId,
          result,
        })
      } catch (error) {
        if (controller.signal.aborted) return
        const result: RunnerImportResult = {
          ok: false,
          error:
            error instanceof ImportDiskError
              ? {
                  code: error.code,
                  message: error.message,
                  requiredBytes: error.requiredBytes,
                  availableBytes: error.availableBytes,
                }
              : {
                  code: 'workspace_start_failed',
                  message:
                    'The stored work could not be restored. Your stored work is kept. Try again.',
                },
        }
        await storage.remember(command, result)
        this.options.reply({
          type: 'import.result',
          commandId: command.commandId,
          activationId: command.activationId,
          epoch: command.epoch,
          connectionId: command.connectionId,
          result,
        })
      } finally {
        clearTimeout(timer)
        if (this.controller === controller) this.controller = null
      }
    })
  }

  private async apply(
    storage: ImportStorage,
    command: RunnerImportCommand,
    open: Extract<RunnerImportAction, { kind: 'open' }>,
    signal: AbortSignal,
  ): Promise<RunnerImportResult> {
    const action = command.action
    if (action.kind === 'open') {
      const existing = await readImportJson(join(storage.directory, 'snapshot'))
      if (
        existing &&
        JSON.stringify(existing) !== JSON.stringify(action.snapshot)
      )
        throw new Error('The import snapshot changed.')
      await saveImportJson(join(storage.directory, 'open'), command)
      await saveImportJson(join(storage.directory, 'snapshot'), action.snapshot)
    } else if (action.kind === 'manifest') {
      const path = storage.path('manifest', String(action.offset))
      const old = await readImportJson(path)
      const count =
        (await readImportJson(join(storage.directory, 'manifest-count'))) ?? 0
      if (
        (old && JSON.stringify(old) !== JSON.stringify(action.entries)) ||
        (!old && count !== action.offset)
      )
        throw new Error('The import manifest order changed.')
      await saveImportJson(path, action.entries)
      for (const entry of action.entries) {
        if (entry.kind === 'object')
          await saveImportJson(storage.path('object', entry.id), entry)
        if (entry.kind === 'part') {
          await saveImportJson(storage.path('part', entry.part.id), entry)
          await saveImportJson(
            storage.path('objectpart', `${entry.objectId}:${entry.index}`),
            entry,
          )
        }
      }
      await saveImportJson(
        join(storage.directory, 'manifest-count'),
        Math.max(Number(count), action.offset + action.entries.length),
      )
    } else if (action.kind === 'preflight') {
      if (
        (await readImportJson(join(storage.directory, 'manifest-count'))) !==
        open.snapshot.recordCount
      )
        throw new Error('The import manifest is incomplete.')
      const sizes = await preflightImport(
        storage,
        this.options.cwd,
        this.options.measureDisk,
      )
      await saveImportJson(join(storage.directory, 'admitted'), sizes)
      return { ok: true, ...sizes }
    } else {
      if (!(await readImportJson(join(storage.directory, 'admitted'))))
        throw new Error('The import disk check is missing.')
      if (action.kind === 'chunk') await receiveImportChunk(storage, action)
      if (action.kind === 'restore')
        await storage.mark('restored', () =>
          applyImport(
            storage,
            open,
            this.options.cwd,
            this.options.home,
            this.options.store,
            command.activationId,
            signal,
            this.options.lfs,
            this.options.measureDisk,
          ),
        )
      if (action.kind === 'session') {
        const preparation = await readImportJson(
          storage.path('session', action.documentId),
        )
        if (preparation !== 'prepared' && preparation !== 'fallback')
          throw new Error('The imported session is not restored.')
        return { ok: true, preparation }
      }
      if (action.kind === 'finish') {
        await this.options.refresh()
        await saveImportJson(join(storage.directory, 'finished'), true)
        await rm(
          importPendingPath(this.options.storageHome ?? this.options.home),
          { force: true },
        )
      }
    }
    return { ok: true }
  }
}
