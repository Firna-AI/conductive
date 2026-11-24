import type { AppDependencies, AppEnv } from '../env'
import { machineChannel } from '../machines/channel'
import { workspaceMachineOwner } from '../machines/client'
import type { SandboxProvider } from '../sandbox/provider'
import {
  advanceStartCommand,
  nextStartCommand,
  prepareStartTerminal,
} from './start-command-execution'
import { stepLabel } from './start-step-label'
import { creationFetchLabel } from './creation-fetch-label'
import type { StartJobStorage, WorkspaceStartJob } from './start-types'
import { WorkspaceStartError } from './workspace-start'
import type { WorkspaceRow } from './workspace-row'
import type { WorkspaceLifecycleEndpoint } from './workspace-runtime'
import { JobTimeLimit } from './job-time-limit'
import { startTimeLimitReached } from './start-provider-retry'
import type { StartCall } from './start-guard'

export async function advanceStartSteps(
  env: AppEnv,
  dependencies: AppDependencies,
  endpoint: WorkspaceLifecycleEndpoint,
  storage: StartJobStorage,
  provider: SandboxProvider,
  row: WorkspaceRow,
  job: WorkspaceStartJob,
  call: StartCall,
  preserveBase = false,
): Promise<boolean> {
  if (job.phase === 'records') throw new WorkspaceStartError(null)
  if (startTimeLimitReached(job, dependencies.now()))
    throw new JobTimeLimit('start')
  if (job.phase === 'terminal-password') {
    await call(() => prepareStartTerminal(env, dependencies, job))
    await endpoint.lifecycleStep('startup', stepLabel('startup'), 'completed')
    await nextStartCommand(storage, job, 'runner', dependencies.now())
    return true
  }
  const sandboxId = row.sandboxId
  if (!sandboxId) throw new WorkspaceStartError(null)
  const channel = machineChannel(
    env,
    workspaceMachineOwner(row.orgId, row.id),
    provider,
    sandboxId,
  )
  const label =
    job.phase === 'fetch' &&
    (job.baseBranch ||
      (job.startBranch ?? job.defaultBranch) !== job.defaultBranch)
      ? await call(() => creationFetchLabel(env.DB, job))
      : stepLabel(job.phase)
  if (
    !(await advanceStartCommand(
      env,
      endpoint,
      storage,
      { sandboxId, provider, channel },
      row,
      job,
      label,
      call,
      dependencies,
      preserveBase,
    ))
  )
    return false
  if (job.phase === 'startup' || job.phase === 'terminal') {
    await nextStartCommand(
      storage,
      job,
      job.phase === 'startup' ? 'terminal' : 'terminal-password',
      dependencies.now(),
    )
    return false
  }
  await endpoint.lifecycleStep(job.phase, label, 'completed')
  if (job.phase === 'fetch' || job.phase === 'branch') {
    await nextStartCommand(
      storage,
      job,
      job.phase === 'fetch' ? 'branch' : 'startup',
      dependencies.now(),
    )
    return false
  }
  return false
}
