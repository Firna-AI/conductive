import {
  PROVIDER_STOP_START_ALARM,
  PROVIDER_STOP_START_KEY,
} from '../chat/provider-stop-start'
import { chatKey } from '../chat/storage-keys'
import type { QueueTurn } from '../chat/queue-turn'
import type { AppDependencies, AppEnv } from '../env'
import type { WorkspaceAlarms } from '../features/alarms'
import { HttpError } from '../http'
import { warnWorker } from '../warnings'
import { errorSummary, WarningId } from '../warning-values'
import type { DurableLifecycle } from './durable'
import type { WorkspaceStorage } from './platform-storage'
import { workspaceRuntime } from './runtime'
import { readWorkspace } from './workspace-data'
import { resumeWorkspace } from './workspace-resume'

export async function resumeProviderStoppedWorkspace(input: {
  env: AppEnv
  dependencies: AppDependencies
  storage: WorkspaceStorage
  alarms: WorkspaceAlarms
  lifecycle: DurableLifecycle
  turn?: QueueTurn
}): Promise<void> {
  const { storage, alarms, lifecycle, env, dependencies } = input
  const due = await storage.get('providerStopStart', PROVIDER_STOP_START_KEY)
  const clear = async () => {
    await storage.delete(PROVIDER_STOP_START_KEY)
    await alarms.set(PROVIDER_STOP_START_ALARM, null)
  }
  if (!due) {
    await clear()
    return
  }
  await alarms.set(PROVIDER_STOP_START_ALARM, dependencies.now() + 30_000)
  const state = await lifecycle.read()
  if (!state || state.state !== 'stopped') {
    await clear()
    return
  }
  let senderId: string | undefined
  for (const id of due.turnIds) {
    const turn = await storage.get('chatTurn', chatKey('turn', id))
    if (turn?.state === 'queued') {
      senderId = turn.senderId
      break
    }
  }
  if (!senderId) {
    await clear()
    return
  }
  try {
    const row = await readWorkspace(env.DB, state.orgId, state.workspaceId)
    if (row.archivedAt !== null) {
      await clear()
      return
    }
    // The lifecycle is stopped, so a row that is not stopped yet waits for
    // its projection. The alarm set above tries again.
    if (row.state !== 'stopped') return
    const requestedById = senderId
    const resume = () =>
      resumeWorkspace(
        workspaceRuntime(env, dependencies),
        state.orgId,
        state.workspaceId,
        requestedById,
      )
    if (input.turn) await input.turn.outside(resume)
    else await resume()
    if ((await lifecycle.read())?.state === 'starting') await clear()
  } catch (error) {
    if (!(
      error instanceof HttpError &&
      error.status >= 400 &&
      error.status < 500 &&
      error.status !== 429
    ))
      throw error
    await clear()
    warnWorker({
      kind: 'workspace_provider_resume_refused',
      workspaceId: WarningId.checked(state.workspaceId),
      error: errorSummary(error),
    })
  }
}
