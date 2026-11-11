import type { AppEnv } from '../env'
import type {
  StartJobStorage,
  WorkspaceStartResult,
  WorkspaceCreationAdmission,
} from './start-types'
import { publishCreationResult } from './creation-publication'

interface Publisher<T> {
  publish(value: T): void
}

export async function publishStartCompletion(
  env: AppEnv,
  storage: StartJobStorage,
  waiters: Publisher<WorkspaceStartResult>,
  creation: Publisher<WorkspaceStartResult>,
  admission: Publisher<WorkspaceCreationAdmission>,
  result: WorkspaceStartResult,
  prepare: () => Promise<boolean>,
): Promise<boolean> {
  const job = await storage.job()
  if (result.ok && !(await prepare())) return false
  if (job) await storage.complete(job.attempt, result)
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
