import type { AppEnv } from '../env'
import type { ConnectionScheduler } from '../security/connection-access'
import { runWorkspaceAlarm } from './entry'
import { captureUnexpectedWorkerFailure } from './policy'
import { workerErrorRuntime } from './production'
import { workspaceDiagnosticResponse } from './response-diagnostics'
import type { WorkerErrorRuntime } from './runtime'
import { withWorkerErrorScope } from './scope'
import type { WorkerClassification } from './types'

export function workspaceErrorReporting(
  env: AppEnv,
  waitUntil?: (pending: Promise<unknown>) => void,
  override?: WorkerErrorRuntime,
) {
  const runtime = workerErrorRuntime(env, override)
  const run = <T>(work: () => T): T =>
    withWorkerErrorScope(
      runtime,
      { component: 'workspace' },
      work,
      waitUntil,
      true,
    )
  const callback = <T>(work: () => T): T =>
    withWorkerErrorScope(runtime, { component: 'workspace' }, work, waitUntil)
  const observe = <T>(
    pending: Promise<T>,
    classification: WorkerClassification = 'background_task_failed',
  ): Promise<T> => {
    void pending
      .catch((error: unknown) =>
        callback(() => captureUnexpectedWorkerFailure(classification, error)),
      )
      .catch(() => undefined)
    return pending
  }
  const background = <T>(work: () => Promise<T>): Promise<T> =>
    callback(() => {
      try {
        return observe(work())
      } catch (error) {
        captureUnexpectedWorkerFailure('background_task_failed', error)
        throw error
      }
    })
  return {
    runtime,
    run,
    callback,
    observe,
    checked: <T>(
      classification: WorkerClassification,
      work: () => Promise<T>,
    ): Promise<T> =>
      callback(async () => {
        try {
          return await work()
        } catch (error) {
          captureUnexpectedWorkerFailure(classification, error)
          throw error
        }
      }),
    background,
    alarm: (work: () => Promise<void>) =>
      runWorkspaceAlarm(runtime, work, waitUntil),
    fetch: (work: () => Promise<Response>) =>
      run(async () => workspaceDiagnosticResponse(await work())),
    schedule:
      (schedule: ConnectionScheduler): ConnectionScheduler =>
      (work, delay) =>
        schedule(() => background(work), delay),
  }
}

export type WorkspaceErrorReporting = ReturnType<typeof workspaceErrorReporting>
