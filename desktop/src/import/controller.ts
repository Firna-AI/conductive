import type { DeviceToWorker } from '../../../src/shared/device.ts'
import type { ImportWorkerFrame } from '../../../src/shared/conductor-import-operation.ts'
import { createImportChannel } from './channel.ts'
import type { ImportPreferences } from './preferences.ts'
import type { ImportFrameSend, ImportJobs } from './types.ts'
import { LocalImportError } from './types.ts'
import type { ImportPut } from './upload.ts'
import { directImportPut } from './upload.ts'
import { runImportUpload } from './upload-session.ts'
import { createImportScheduler } from './scheduler.ts'

export interface ImportControllerDependencies {
  preferences: ImportPreferences
  jobs: ImportJobs
  put?: ImportPut
  now?(): number
  userId: string
  send(message: DeviceToWorker): boolean
  sendImport?: ImportFrameSend
  warn(): void
}

/** A replacement connection gets a new controller and no previous tasks. */
export function createImportController(
  dependencies: ImportControllerDependencies,
) {
  const active = new Map<
    string,
    { abort: AbortController; channel: ReturnType<typeof createImportChannel> }
  >()
  const seen = new Set<string>()
  const scheduler = createImportScheduler()
  let disposed = false
  return {
    receive(message: ImportWorkerFrame): void {
      if (disposed) return
      if (message.type !== 'import.operation') {
        active.get(message.operationId)?.channel.receive(message)
        return
      }
      if (seen.has(message.operationId)) return
      seen.add(message.operationId)
      const abort = new AbortController()
      const channel = createImportChannel(
        message.operationId,
        dependencies.send,
        abort,
        { scheduler, sendImport: dependencies.sendImport },
      )
      active.set(message.operationId, { abort, channel })
      const run = async () => {
        const { signal } = abort
        const { preferences, jobs } = dependencies
        const action = message.operation
        if (action.action === 'dismiss') preferences.dismiss()
        if (action.action === 'status' || action.action === 'dismiss') {
          const available = await jobs({ action: 'exists' }, signal)
          await channel.exchange({
            kind: 'status',
            available,
            ...preferences.read(),
          })
        } else {
          if (action.action === 'scan') {
            const allowed = await preferences.allow()
            signal.throwIfAborted()
            if (!allowed) {
              await channel.exchange({
                kind: 'failed',
                code: 'consent_required',
              })
              return
            }
          } else if (preferences.read().consent !== 'allowed') {
            await channel.exchange({ kind: 'failed', code: 'consent_required' })
            return
          }
          if (!(await jobs({ action: 'exists' }, signal)))
            throw new LocalImportError('source_missing')
          if (action.action === 'scan') {
            const rows = await jobs({ action: 'scan' }, signal)
            await channel.list(rows, (rows) => ({ kind: 'scan', rows }))
          } else if (action.action === 'upload' || action.action === 'retry') {
            await runImportUpload(action, {
              jobs,
              channel,
              signal,
              orgId: message.orgId,
              scope: JSON.stringify([dependencies.userId, message.orgId]),
              operationId: message.operationId,
              put: dependencies.put ?? directImportPut(),
              now: dependencies.now ?? Date.now,
            })
          }
        }
        await channel.exchange({ kind: 'done' })
      }
      void run()
        .catch(async (error: unknown) => {
          if (abort.signal.aborted) return
          dependencies.warn()
          try {
            await channel.exchange({
              kind: 'failed',
              code:
                error instanceof LocalImportError
                  ? error.code
                  : message.operation.action === 'upload' ||
                      message.operation.action === 'retry'
                    ? 'upload_failed'
                    : 'read_failed',
            })
          } catch {
            /* Connection disposal ends the operation. */
          }
        })
        .finally(() => {
          active.delete(message.operationId)
        })
    },
    dispose(): void {
      disposed = true
      for (const task of active.values()) task.abort.abort()
      active.clear()
      seen.clear()
    },
  }
}

export type ImportController = ReturnType<typeof createImportController>
