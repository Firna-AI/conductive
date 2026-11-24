import type { CommandRoute, MachineChannel } from '../machines/channel'
import { isTransientHostError } from '../machines/errors'
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
  commandRoute?: CommandRoute
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
  channel: MachineChannel,
  deadlineAt: number,
  command: RetentionCommandPort,
  ownerUserId: string,
): Promise<DiskRetentionResult> {
  const state = command.read()
  let error: string | null = null
  try {
    if (state.processId === null) {
      const settings = await readImageSettings(context.env.DB, context.orgId)
      const started = await channel.startCommand(
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
      await command.save({
        ...state,
        processId: started.processId,
        commandRoute: started.route,
      })
      if (context.dependencies.now() < deadlineAt)
        return { done: false, error: null }
    } else {
      const status = await channel.getCommandStatus(
        { processId: state.processId, route: state.commandRoute ?? 'provider' },
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
    if (
      isTransientHostError(failure) &&
      context.dependencies.now() < deadlineAt
    )
      return { done: false, error: null }
    error = 'The startup script could not run during disk retention.'
  }
  if (context.dependencies.now() >= deadlineAt)
    error = new JobTimeLimit('start').message
  await setRetention(context.env.DB, context.workspaceId, 'stop', error)
  return { done: false, error }
}
