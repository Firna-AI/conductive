import type { AppDependencies, AppEnv } from '../env'
import { orgSandboxProvider } from '../sandbox/client'
import {
  clearSandboxCleanup,
  deleteSandboxIfPresent,
  recordSandboxCleanup,
} from './cleanup'
import type { WorkspaceStorage } from './platform-storage'
import { createResource } from './resource-intents'
import { firstOrgAdmin } from './settings-data'
import { readWorkspaceAllocation } from './start-allocation'
import { readStartJob, serializeStartJob } from './start-job-codec'

export const START_ALLOCATION_CLEANUP_KEY = 'lifecycle:allocation-cleanup'

export async function retryAllocationCleanup(
  storage: WorkspaceStorage,
  env: AppEnv,
  dependencies: AppDependencies,
): Promise<boolean> {
  const stored = await storage.get('job', START_ALLOCATION_CLEANUP_KEY)
  if (!stored) return true
  const job = readStartJob(stored)
  const admin = await firstOrgAdmin(env.DB, job.orgId)
  if (!admin) return false
  const provider = await orgSandboxProvider(
    env,
    admin.userId,
    job.orgId,
    dependencies.fetch,
  )
  if (!job.allocatedSandboxId) {
    const sandbox = await createResource(provider, {
      kind: 'sandbox',
      input: await readWorkspaceAllocation(env, job),
      persist: () =>
        storage.put(
          'job',
          START_ALLOCATION_CLEANUP_KEY,
          serializeStartJob(job),
        ),
    })
    job.allocatedSandboxId = sandbox.id
    await storage.put(
      'job',
      START_ALLOCATION_CLEANUP_KEY,
      serializeStartJob(job),
    )
  }
  await recordSandboxCleanup(env.DB, {
    workspaceId: job.workspaceId,
    orgId: job.orgId,
    sandboxId: job.allocatedSandboxId,
  })
  await deleteSandboxIfPresent(provider, job.allocatedSandboxId)
  await clearSandboxCleanup(env.DB, job.workspaceId)
  await storage.delete(START_ALLOCATION_CLEANUP_KEY)
  return true
}
