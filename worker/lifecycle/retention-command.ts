import { captureUnexpectedWorkerFailure } from '../error-reporting/policy'
import type { SandboxProvider } from '../sandbox/provider'
import { lifecycleCommand } from './command-intents'
import type { DiskRetentionResult } from './durable-types'
import { workspaceStartupCommand } from './image-software'
import { JobTimeLimit } from './job-time-limit'
import { setRetention } from './retention-data'
import { ownerCommitAuthor } from './sandbox-environment'
import { readImageSettings } from './settings-data'
import type { WorkspaceActionContext } from './workspace-actions'

export interface RetentionCommandState {
  attempt: string
  processId: number | null
  stdoutOffset: number
  stderrOffset: number
  stopRequestedAt?: number
}

export interface RetentionCommandPort {
  read(): RetentionCommandState
  save(state: RetentionCommandState): Promise<void>
}

export async function advanceRetentionCommand(
  context: WorkspaceActionContext,
  provider: SandboxProvider,
  sandboxId: string,
  deadlineAt: number,
  command: RetentionCommandPort,
  ownerUserId: string,
): Promise<DiskRetentionResult> {
  const state = command.read()
  let error: string | null = null
  try {
    if (state.processId === null) {
      const settings = await readImageSettings(context.env.DB, context.orgId)
      const started = await provider.startCommand(
        sandboxId,
        lifecycleCommand(
          {
            kind: 'workspace',
            id: context.workspaceId,
            attempt: state.attempt,
          },
          'startup',
          workspaceStartupCommand(
            settings.startupScript,
            await ownerCommitAuthor(context.env.DB, ownerUserId),
            'retention',
          ),
        ),
      )
      await command.save({ ...state, processId: started.processId })
      if (context.dependencies.now() < deadlineAt)
        return { done: false, error: null }
    } else {
      const status = await provider.getCommandStatus(
        sandboxId,
        state.processId,
        {
          stdoutOffset: state.stdoutOffset,
          stderrOffset: state.stderrOffset,
        },
      )
      await command.save({
        ...state,
        stdoutOffset: status.stdoutNextOffset,
        stderrOffset: status.stderrNextOffset,
      })
      if (context.dependencies.now() < deadlineAt) {
        if (status.more || status.running) return { done: false, error: null }
        if (
          status.state !== 'exited' ||
          status.exitCode !== 0 ||
          status.timedOut
        )
          error = 'The startup script failed during disk retention.'
      }
    }
  } catch (failure) {
    captureUnexpectedWorkerFailure('lifecycle_retry_failed', failure)
    error = 'The startup script could not run during disk retention.'
  }
  if (context.dependencies.now() >= deadlineAt)
    error = new JobTimeLimit('start').message
  await setRetention(context.env.DB, context.workspaceId, 'stop', error)
  return { done: false, error }
}
