import type { WorkspaceFiles } from '../files/workspace'
import { captureUnexpectedWorkerFailure } from '../error-reporting/policy'
import type { WorkspaceErrorReporting } from '../error-reporting/workspace'
import type { ChatDependencies } from './types'

export function reportingRunnerAttachment(
  files: WorkspaceFiles,
  reporting: WorkspaceErrorReporting,
  waitUntil: (pending: Promise<unknown>) => void,
): ChatDependencies['runnerAttached'] {
  return (_workspaceId, connectionId, send) => {
    files.runner.attach(connectionId, (command) => {
      waitUntil(
        send(command).then(
          (sent) => {
            if (!sent) files.runner.detach(connectionId)
          },
          (error: unknown) => {
            if (!files.runner.detach(connectionId, error))
              reporting.callback(() =>
                captureUnexpectedWorkerFailure('background_task_failed', error),
              )
          },
        ),
      )
    })
  }
}
