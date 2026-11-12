import type { AppDependencies, AppEnv } from '../env'
import type { SandboxProvider } from '../sandbox/provider'
import { readWorkspace } from './workspace-data'
import { startProvider } from './start-access'
import { advanceStartMachine } from './start-machine'
import { advanceStartSteps } from './start-progress'
import { runnerStartConnected } from './start-completion'
import type { StartCall } from './start-guard'
import type { StartJobStorage, WorkspaceStartJob } from './start-types'
import type { WorkspaceController } from './workspace-controller-types'

export async function advanceStartPhases(input: {
  env: AppEnv
  dependencies: AppDependencies
  endpoint: WorkspaceController
  storage: StartJobStorage
  provider: SandboxProvider
  job: WorkspaceStartJob
  call: StartCall
  finish(): Promise<boolean>
}): Promise<boolean> {
  const { env, dependencies, endpoint, storage, job, call, finish } = input
  const { row, provider } = await call(async () => {
    const row = await readWorkspace(env.DB, job.orgId, job.workspaceId)
    const provider =
      row.sandboxId && row.providerAccount !== job.providerAccount
        ? await startProvider(env, dependencies.fetch, {
            ...job,
            providerAccount: row.providerAccount,
          })
        : input.provider
    return { row, provider }
  })
  const state = await endpoint.readLifecycle()
  if (!state?.start || state.state === 'stopped' || state.state === 'error')
    await endpoint.beginLifecycleStart(job.kind)
  if (job.phase === 'runner') {
    return await finish()
  }
  if (job.phase === 'machine' || job.phase === 'ready') {
    const next = await advanceStartMachine(
      env,
      dependencies,
      endpoint,
      provider,
      row,
      job,
      storage,
      call,
    )
    if (next)
      await storage.update({
        ...job,
        ...next,
        providerRetry: null,
        processId: null,
        stdoutOffset: 0,
        stderrOffset: 0,
      })
    else await storage.retry(job.attempt, 'progress')
    return false
  }
  if (
    !(await advanceStartSteps(
      env,
      dependencies,
      endpoint,
      storage,
      provider,
      row,
      job,
      call,
    ))
  )
    return false
  if (!(await runnerStartConnected(endpoint))) return false
  return await finish()
}
