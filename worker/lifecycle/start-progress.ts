import type { AppDependencies, AppEnv } from '../env'
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
  const label =
    job.phase === 'fetch' && job.baseBranch
      ? await creationFetchLabel(env.DB, job)
      : stepLabel(job.phase)
  if (
    !(await advanceStartCommand(
      env,
      endpoint,
      storage,
      provider,
      row,
      job,
      label,
    ))
  )
    return false
  if (job.phase === 'startup')
    await prepareStartTerminal(env, dependencies, job)
  await endpoint.lifecycleStep(job.phase, label, 'completed')
  if (job.phase === 'fetch' || job.phase === 'branch') {
    await nextStartCommand(
      storage,
      job,
      job.phase === 'fetch' ? 'branch' : 'startup',
    )
    return false
  }
  await nextStartCommand(storage, job, 'runner')
  return true
}
