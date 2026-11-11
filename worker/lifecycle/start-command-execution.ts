import type { AppDependencies, AppEnv } from '../env'
import type { SandboxProvider } from '../sandbox/provider'
import {
  startWorkspaceTerminal,
  terminalStartCommand,
} from '../terminal/service'
import { warnWorker } from '../warnings'
import { WarningId } from '../warning-values'
import { lifecycleCommand } from './command-intents'
import { workspacePhaseCommand } from './start-command'
import { workspaceEnvironmentSettings } from './settings-data'
import { environmentSecrets } from './org-environment'
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
import { HttpError } from '../http'
import { BRANCH_NOT_FOUND_EXIT_CODE } from './existing-branch-command'
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
    job.phase !== 'startup' &&
    job.phase !== 'import-software' &&
    job.phase !== 'import-launch' &&
    job.phase !== 'terminal'
  )
    throw new WorkspaceStartError(null)
  await provider.setAutoStop(row.sandboxId, 1_800)
  if (job.processId === null) {
    const values = await workspaceEnvironmentSettings(
      env,
      job.orgId,
      job.environmentCiphertext,
    )
    await storage.secrets([
      await readWorkspaceToken(env, job.workspaceId),
      ...environmentSecrets(values),
    ])
    if (job.phase !== 'terminal')
      await endpoint.lifecycleStep(job.phase, label, 'running')
    const started = await provider.startCommand(
      row.sandboxId,
      lifecycleCommand(
        {
          kind: 'workspace',
          id: job.workspaceId,
          attempt:
            job.kind === 'activate' && job.phase === 'import-launch'
              ? (job.activation.launchAttempt ?? job.attempt)
              : (job.commandAttempt ?? job.attempt),
        },
        job.phase,
        job.phase === 'terminal'
          ? terminalStartCommand()
          : workspacePhaseCommand(row, job),
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
  if (status.state !== 'exited' || status.exitCode !== 0 || status.timedOut) {
    if (
      job.phase === 'fetch' &&
      job.creation?.branchMode === 'existing' &&
      status.state === 'exited' &&
      status.exitCode === BRANCH_NOT_FOUND_EXIT_CODE &&
      !status.timedOut
    )
      throw new HttpError(
        409,
        'branch_not_found',
        `The branch "${row.branch}" no longer exists on GitHub. Restore it, then try again.`,
      )
    if (job.phase === 'terminal')
      warnWorker({
        kind: 'terminal_start_failed',
        workspaceId: WarningId.checked(job.workspaceId),
        exitCode: status.exitCode,
        timedOut: status.timedOut,
      })
    throw new WorkspaceStartError(null)
  }
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
    afterReadyPhase:
      job.kind === 'create' && phase === 'terminal'
        ? 'startup'
        : job.afterReadyPhase,
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
