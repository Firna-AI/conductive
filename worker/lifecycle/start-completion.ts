import type { AppDependencies, AppEnv } from '../env'
import { ProviderError } from '../sandbox/errors'
import { markTerminalRestoreEnded } from '../terminal/service'
import { RESTORE_POLL_MS } from './durable-types'
import { requireActiveStartUsers } from './start-access'
import { JobTimeLimit } from './job-time-limit'
import { providerState } from './provider-state'
import { startTimeLimitReached } from './start-provider-retry'
import type { StartJobStorage, WorkspaceStartJob } from './start-types'
import { actionResources } from './workspace-actions'
import type { WorkspaceLifecycleEndpoint } from './workspace-runtime'
import {
  StartSuperseded,
  startCallInPlace,
  type StartCall,
} from './start-guard'

interface StartProgress {
  env: AppEnv
  dependencies: AppDependencies
  storage: StartJobStorage
  job: WorkspaceStartJob
  call: StartCall
}

export function startRestorePollAt(
  job:
    | Pick<
        WorkspaceStartJob,
        'phase' | 'restorePollAt' | 'providerRetry' | 'cancelled' | 'failure'
      >
    | undefined,
): number {
  if (
    job?.restorePollAt === undefined ||
    job.cancelled ||
    job.failure ||
    job.phase === 'records' ||
    job.phase === 'machine' ||
    job.phase === 'ready'
  )
    return Infinity
  return Math.max(job.restorePollAt, job.providerRetry?.retryAt ?? 0)
}

export async function pollStartRestore({
  env,
  dependencies,
  storage,
  job,
  call,
}: StartProgress): Promise<WorkspaceStartJob> {
  const now = dependencies.now()
  if (now < startRestorePollAt(job)) return job
  if (startTimeLimitReached(job, now)) throw new JobTimeLimit('start')
  let markerWritten = false
  let retryAfter = 0
  try {
    const { provider, sandboxId, sandbox } = await call(async () => {
      const { provider, sandboxId } = await actionResources({
        env,
        dependencies,
        orgId: job.orgId,
        workspaceId: job.workspaceId,
      })
      return { provider, sandboxId, sandbox: await provider.get(sandboxId) }
    })
    if (startTimeLimitReached(job, dependencies.now()))
      throw new JobTimeLimit('start')
    if (
      providerState(sandbox.state) === 'ready' &&
      sandbox.hydrated !== false
    ) {
      await call(() => markTerminalRestoreEnded(provider, sandboxId))
      markerWritten = true
    }
  } catch (error) {
    if (error instanceof StartSuperseded || error instanceof JobTimeLimit)
      throw error
    // The start can continue. Retry the restore check or leave it to the watch.
    if (
      error instanceof ProviderError &&
      Number.isSafeInteger(error.retryAfterSeconds)
    )
      retryAfter = (error.retryAfterSeconds ?? 0) * 1_000
  }
  const current = {
    ...job,
    restorePollAt: markerWritten
      ? undefined
      : dependencies.now() + Math.max(RESTORE_POLL_MS, retryAfter),
  }
  await storage.update(current)
  return current
}

export async function prepareStartRunner(
  input: StartProgress & { endpoint: WorkspaceLifecycleEndpoint },
): Promise<WorkspaceStartJob | undefined> {
  const { env, dependencies, endpoint, job, call } = input
  if (job.phase !== 'runner' || job.cancelled || job.failure) return job
  await call(() => requireActiveStartUsers(env.DB, job))
  const current = startTimeLimitReached(job, dependencies.now())
    ? job
    : await pollStartRestore(input)
  if (
    (await runnerStartConnected(endpoint)) ||
    startTimeLimitReached(current, dependencies.now())
  )
    return current
}

export async function runnerStartConnected(
  endpoint: WorkspaceLifecycleEndpoint,
): Promise<boolean> {
  const state = await endpoint.readLifecycle()
  if (!state?.start?.steps.some((step) => step.id === 'runner'))
    await endpoint.lifecycleStep('runner', 'Starting the agent', 'running')
  return state?.runnerConnected ?? false
}

export async function prepareStartSuccess(
  env: AppEnv,
  endpoint: WorkspaceLifecycleEndpoint,
  storage: StartJobStorage,
  now: () => number,
  call: StartCall = startCallInPlace,
): Promise<boolean> {
  const job = await storage.job()
  if (!job || job.cancelled || job.failure) return false
  await call(() => requireActiveStartUsers(env.DB, job))
  const current = await storage.job()
  if (!current || current.cancelled || current.failure) return false
  if (startTimeLimitReached(current, now())) throw new JobTimeLimit('start')
  if (!(await endpoint.readLifecycle())?.runnerConnected) return false
  await endpoint.lifecyclePrepared()
  return true
}
