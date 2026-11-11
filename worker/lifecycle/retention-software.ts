import type { SandboxProvider } from '../sandbox/provider'
import { lifecycleCommand } from './command-intents'
import type { DiskRetentionResult } from './durable-types'
import { JobTimeLimit } from './job-time-limit'
import { setRetention } from './retention-data'
import type { RetentionCommandPort } from './retention-command'
import type { WorkspaceActionContext } from './workspace-actions'
import {
  recordSoftwareUpdateOutcome,
  softwareUpdateOutcome,
} from './workspace-software-update'

export async function advanceRetentionSoftware(
  context: WorkspaceActionContext,
  provider: SandboxProvider,
  sandboxId: string,
  deadlineAt: number,
  command: RetentionCommandPort,
): Promise<DiskRetentionResult> {
  const { env, orgId, workspaceId, dependencies } = context
  const state = command.read()
  try {
    const update = state.softwareUpdate
    if (!update) throw new Error('Missing pinned retention software update')
    await command.softwareStep('running')
    if (dependencies.now() >= deadlineAt) throw new JobTimeLimit('start')
    let outcome: 'completed' | 'failed'
    if (update.kind === 'unavailable') outcome = 'failed'
    else if (state.processId === null) {
      const started = await provider.startCommand(
        sandboxId,
        lifecycleCommand(
          { kind: 'workspace', id: workspaceId, attempt: state.attempt },
          'software',
          update.command,
        ),
      )
      await command.save({ ...state, processId: started.processId })
      if (dependencies.now() >= deadlineAt) throw new JobTimeLimit('start')
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
      if (dependencies.now() >= deadlineAt) throw new JobTimeLimit('start')
      if (status.more || status.running) return { done: false, error: null }
      outcome = softwareUpdateOutcome(status)
    }
    if (dependencies.now() >= deadlineAt) throw new JobTimeLimit('start')
    await recordSoftwareUpdateOutcome(
      env.DB,
      orgId,
      workspaceId,
      update,
      outcome,
    )
    await command.softwareStep(outcome)
    await setRetention(env.DB, workspaceId, 'startup')
    return { done: false, error: null }
  } catch {
    const error =
      dependencies.now() >= deadlineAt
        ? new JobTimeLimit('start').message
        : 'The agent and terminal software could not update. Try again.'
    await setRetention(env.DB, workspaceId, 'stop', error)
    return { done: false, error }
  }
}
