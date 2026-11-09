import type { BackendActor } from './backend-test-platform'
import {
  readStartJob,
  serializeStartJob,
  type StoredWorkspaceStartJob,
} from './start-job-codec'
import { START_JOB_KEY, START_LOG_PREFIX } from './start-storage'
import { START_ALLOCATION_CLEANUP_KEY } from './start-allocation-cleanup'
import type { WorkspaceStartJob } from './start-types'

export function storedStartJobs(storage: Pick<DurableObjectStorage, 'get'>) {
  return storage.get<StoredWorkspaceStartJob>([
    START_JOB_KEY,
    START_ALLOCATION_CLEANUP_KEY,
  ])
}

export function backendStart(
  actor: BackendActor,
  now: () => number,
  advanceTo: (at: number) => Promise<unknown>,
  accepted: () => StoredWorkspaceStartJob | undefined,
) {
  return {
    job: async () => {
      const job =
        await actor.storage.get<StoredWorkspaceStartJob>(START_JOB_KEY)
      return job ? readStartJob(job) : undefined
    },
    advance: async () => {
      await actor.ready
      await advanceTo(
        Math.max(now(), (await actor.storage.getAlarm()) ?? now()),
      )
    },
    wait: () => actor.endpoint().waitLifecycleStart(),
    restart: actor.restart,
    lastAccepted: () => {
      const job = accepted()
      return job ? readStartJob(structuredClone(job)) : undefined
    },
    storedCiphertexts: async () => [
      ...(
        await actor.storage.list<string>({ prefix: START_LOG_PREFIX })
      ).values(),
    ],
    holdResultRead: actor.holdResultRead,
    holdAdmission: actor.holdAdmission,
    queueForEpochGuard: (job: WorkspaceStartJob) =>
      actor.native.api.lifecycleControls.queueForEpochGuard(
        serializeStartJob(job),
      ),
  }
}
