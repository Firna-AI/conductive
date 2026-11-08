import type { AppDependencies, AppEnv } from '../env'
import type { SandboxProvider } from '../sandbox/provider'
import { startWorkspaceTerminal } from '../terminal/service'
import { lifecycleCommand } from './command-intents'
import { workspacePhaseCommand } from './start-command'
import { workspaceEnvironment } from './settings-data'
import { readWorkspaceToken } from './tokens'
import type {
  StartJobStorage,
  WorkspaceStartJob,
  WorkspaceMachinePhase,
  WorkspaceRunningStartJob,
} from './start-types'
import type { WorkspaceRow } from './workspace-data'
import type { WorkspaceLifecycleEndpoint } from './workspace-runtime'
import { WorkspaceStartError } from './workspace-start'
import { JobTimeLimit } from './job-time-limit'
import { startTimeLimitReached } from './start-provider-retry'

export async function advanceStartCommand(
  env: AppEnv,
  endpoint: WorkspaceLifecycleEndpoint,
  storage: StartJobStorage,
  provider: SandboxProvider,
  row: WorkspaceRow,
  job: WorkspaceStartJob,
  label: string,
): Promise<boolean> {
  if (!row.sandboxId) throw new WorkspaceStartError(null)
  if (
    job.phase !== 'fetch' &&
    job.phase !== 'branch' &&
    job.phase !== 'startup'
  )
    throw new WorkspaceStartError(null)
  await provider.setAutoStop(row.sandboxId, 1_800)
  if (job.processId === null) {
    const values = await workspaceEnvironment(
      env,
      job.orgId,
      job.environmentCiphertext,
    )
    await storage.secrets([
      await readWorkspaceToken(env, job.workspaceId),
      ...Object.values(values),
    ])
    await endpoint.lifecycleStep(job.phase, label, 'running')
    const started = await provider.startCommand(
      row.sandboxId,
      lifecycleCommand(
        {
          kind: 'workspace',
          id: job.workspaceId,
          attempt: job.commandAttempt ?? job.attempt,
        },
        job.phase,
        workspacePhaseCommand(row, job),
      ),
    )
    await storage.update({ ...job, processId: started.processId })
    await storage.retry(job.attempt, 'progress')
    return false
  }
  const status = await provider.getCommandStatus(row.sandboxId, job.processId, {
    stdoutOffset: job.stdoutOffset,
    stderrOffset: job.stderrOffset,
  })
  await storage.capture(job, status)
  await storage.retry(job.attempt, 'progress')
  if (status.more || status.running) return false
  if (status.state !== 'exited' || status.exitCode !== 0 || status.timedOut)
    throw new WorkspaceStartError(null)
  return true
}

export async function nextStartCommand(
  storage: StartJobStorage,
  job: WorkspaceRunningStartJob,
  phase: WorkspaceMachinePhase,
): Promise<void> {
  await storage.update({
    ...job,
    phase,
    providerRetry: null,
    processId: null,
    stdoutOffset: 0,
    stderrOffset: 0,
  })
}

export async function prepareStartTerminal(
  env: AppEnv,
  dependencies: AppDependencies,
  job: WorkspaceStartJob,
): Promise<void> {
  if (startTimeLimitReached(job, dependencies.now()))
    throw new JobTimeLimit('start')
  await startWorkspaceTerminal(env, job.orgId, job.workspaceId, dependencies)
  if (startTimeLimitReached(job, dependencies.now()))
    throw new JobTimeLimit('start')
}
