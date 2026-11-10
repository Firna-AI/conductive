import type { AppDependencies, AppEnv } from '../env'
import type { SandboxProvider } from '../sandbox/provider'
import {
  advanceStartCommand,
  nextStartCommand,
  prepareStartTerminal,
} from './start-command-execution'
import { stepLabel } from './start-step-label'
import type { StartJobStorage, WorkspaceStartJob } from './start-types'
import { WorkspaceStartError } from './workspace-start'
import type { WorkspaceRow } from './workspace-data'
import type { WorkspaceLifecycleEndpoint } from './workspace-runtime'
import { JobTimeLimit } from './job-time-limit'
import { startTimeLimitReached } from './start-provider-retry'

export async function advanceStartSteps(
  env: AppEnv,
  dependencies: AppDependencies,
  endpoint: WorkspaceLifecycleEndpoint,
  storage: StartJobStorage,
  provider: SandboxProvider,
  row: WorkspaceRow,
  job: WorkspaceStartJob,
): Promise<boolean> {
  if (job.phase === 'records') throw new WorkspaceStartError(null)
  if (startTimeLimitReached(job, dependencies.now()))
    throw new JobTimeLimit('start')
  if (job.phase === 'terminal-password') {
    await prepareStartTerminal(env, dependencies, job)
    await endpoint.lifecycleStep('startup', stepLabel('startup'), 'completed')
    await nextStartCommand(storage, job, 'runner')
    return true
  }
  if (
    !(await advanceStartCommand(
      env,
      endpoint,
      storage,
      provider,
      row,
      job,
      stepLabel(job.phase, job.creation?.branchMode),
    ))
  )
    return false
  if (job.phase === 'startup' || job.phase === 'terminal') {
    await nextStartCommand(
      storage,
      job,
      job.phase === 'startup' ? 'terminal' : 'terminal-password',
    )
    return false
  }
  await endpoint.lifecycleStep(
    job.phase,
    stepLabel(job.phase, job.creation?.branchMode),
    'completed',
  )
  if (job.phase === 'fetch' || job.phase === 'branch') {
    await nextStartCommand(
      storage,
      job,
      job.phase === 'fetch' ? 'branch' : 'startup',
    )
    return false
  }
  return false
}
