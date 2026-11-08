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
  if (
    !(await advanceStartCommand(
      env,
      endpoint,
      storage,
      provider,
      row,
      job,
      stepLabel(job.phase),
    ))
  )
    return false
  if (job.phase === 'startup')
    await prepareStartTerminal(env, dependencies, job)
  await endpoint.lifecycleStep(job.phase, stepLabel(job.phase), 'completed')
  if (job.phase === 'fetch' || job.phase === 'branch') {
    await nextStartCommand(
      storage,
      job,
      job.phase === 'fetch' ? 'branch' : 'startup',
    )
    return false
  }
  await nextStartCommand(storage, job, 'runner')
  if (!(await endpoint.readLifecycle())?.runnerConnected)
    await endpoint.lifecycleStep('runner', 'Starting the agent', 'running')
  await endpoint.lifecyclePrepared()
  return true
}
