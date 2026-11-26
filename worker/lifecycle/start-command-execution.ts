import type { AppDependencies, AppEnv } from '../env'
import type { SandboxProvider } from '../sandbox/provider'
import {
  startWorkspaceTerminal,
  terminalStartCommand,
} from '../terminal/service'
import { warnWorker } from '../warnings'
import { WarningId } from '../warning-values'
import { lifecycleCommand } from './command-intents'
import { latestSoftwareRelease } from './software-release'
import type { StartupBootstrap } from './software-bootstrap'
import { workspacePhaseCommand } from './start-command'
import { workspaceEnvironmentSettings } from './settings-data'
import { environmentSecrets } from './org-environment'
import { ownerCommitAuthor } from './sandbox-environment'
import { readWorkspaceToken } from './tokens'
import type {
  StartJobStorage,
  WorkspaceStartJob,
  WorkspaceMachinePhase,
  WorkspaceRunningStartJob,
} from './start-types'
import type { WorkspaceRow } from './workspace-row'
import { settleWorkspaceBranch } from './workspace-branch'
import type { WorkspaceLifecycleEndpoint } from './workspace-runtime'
import { WorkspaceStartError } from './workspace-start'
import { JobTimeLimit } from './job-time-limit'
import { startTimeLimitReached } from './start-provider-retry'
import type { StartCall } from './start-guard'
import { missingStartBranchFailure } from './start-branch-failure'
import { workspaceAutoStopSeconds } from './idle-stop'

export async function advanceStartCommand(
  env: AppEnv,
  endpoint: WorkspaceLifecycleEndpoint,
  storage: StartJobStorage,
  provider: SandboxProvider,
  row: WorkspaceRow,
  job: WorkspaceStartJob,
  label: string,
  call: StartCall,
  dependencies: Pick<AppDependencies, 'fetch' | 'now'>,
  preserveBase = false,
): Promise<boolean> {
  const sandboxId = row.sandboxId
  if (!sandboxId) throw new WorkspaceStartError(null)
  if (
    job.phase !== 'fetch' &&
    job.phase !== 'branch' &&
    job.phase !== 'startup' &&
    job.phase !== 'terminal'
  )
    throw new WorkspaceStartError(null)
  const phase = job.phase
  if (
    job.autoStopSetAt === undefined ||
    dependencies.now() - job.autoStopSetAt >= 60_000
  ) {
    const autoStop = await call(() => workspaceAutoStopSeconds(env.DB))
    await call(() => provider.setAutoStop(sandboxId, autoStop))
    job.autoStopSetAt = dependencies.now()
    await storage.update(job)
  }
  if (job.processId === null) {
    const secrets = await call(async () => {
      const values = await workspaceEnvironmentSettings(
        env,
        job.orgId,
        job.environmentCiphertext,
      )
      return [
        await readWorkspaceToken(env, job.workspaceId),
        ...environmentSecrets(values),
      ]
    })
    await storage.secrets(secrets)
    if (job.phase !== 'terminal')
      await endpoint.lifecycleStep(job.phase, label, 'running')
    let bootstrap: StartupBootstrap | undefined
    if (job.phase === 'startup') {
      try {
        bootstrap = {
          release: await latestSoftwareRelease(env, dependencies.fetch),
        }
      } catch {
        bootstrap = {
          warning:
            'Warning: the cloud computer software release is not available. Bootstrap will retry at the next start.',
        }
      }
    }
    // From the branch step on, the sandbox uses the branch, so a later name
    // no longer changes it.
    const commandRow =
      phase === 'fetch'
        ? row
        : {
            ...row,
            branch:
              (await call(() =>
                settleWorkspaceBranch(env.DB, job.workspaceId),
              )) ?? row.branch,
          }
    const started = await call(async () =>
      provider.startCommand(
        sandboxId,
        lifecycleCommand(
          {
            kind: 'workspace',
            id: job.workspaceId,
            attempt: job.commandAttempt ?? job.attempt,
          },
          phase,
          job.phase === 'terminal'
            ? terminalStartCommand()
            : workspacePhaseCommand(
                commandRow,
                job,
                job.phase === 'startup'
                  ? await ownerCommitAuthor(env.DB, row.ownerUserId)
                  : null,
                preserveBase,
                bootstrap,
              ),
        ),
      ),
    )
    await storage.update({ ...job, processId: started.processId })
    await storage.retry(job.attempt, 'progress')
    return false
  }
  const processId = job.processId
  const status = await call(() =>
    provider.getCommandStatus(sandboxId, processId, {
      stdoutOffset: job.stdoutOffset,
      stderrOffset: job.stderrOffset,
    }),
  )
  await storage.capture(job, status)
  await storage.retry(job.attempt, 'progress')
  if (status.more || status.running) return false
  if (status.state !== 'exited' || status.exitCode !== 0 || status.timedOut) {
    if (
      job.phase === 'fetch' &&
      status.state === 'exited' &&
      !status.timedOut
    ) {
      const missing = missingStartBranchFailure(job, status.exitCode)
      if (missing) throw missing
    }
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
  now: number,
): Promise<void> {
  await storage.update({
    ...job,
    phase,
    waitStartedAt: now,
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
