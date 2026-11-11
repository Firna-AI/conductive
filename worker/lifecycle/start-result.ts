import type { AppEnv } from '../env'
import type {
  StartJobStorage,
  WorkspaceStartResult,
  WorkspaceCreationAdmission,
} from './start-types'
import { publishCreationResult } from './creation-publication'
import { prepareStartSuccess } from './start-completion'
import type { WorkspaceLifecycleEndpoint } from './workspace-runtime'

interface Publisher<T> {
  publish(value: T): void
}

export async function publishStartCompletion(
  env: AppEnv,
  endpoint: WorkspaceLifecycleEndpoint,
  storage: StartJobStorage,
  now: () => number,
  waiters: Publisher<WorkspaceStartResult>,
  creation: Publisher<WorkspaceStartResult>,
  admission: Publisher<WorkspaceCreationAdmission>,
  result: WorkspaceStartResult,
): Promise<boolean> {
  if (result.ok && !(await prepareStartSuccess(env, endpoint, storage, now)))
    return false
  const job = await storage.job()
  await storage.complete(result)
  const stored = (await storage.result()) ?? result
  if (job?.kind === 'create') {
    const admitted = await storage.admission()
    if (admitted) admission.publish(admitted)
    creation.publish((await storage.creationResult()) ?? stored)
    await publishCreationResult(env, storage)
  }
  waiters.publish(stored)
  return true
}
