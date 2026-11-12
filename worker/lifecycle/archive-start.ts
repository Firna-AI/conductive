import type {
  StartJobStorage,
  WorkspaceStartResult,
  WorkspaceCreationAdmission,
} from './start-types'
import type { WorkspaceStartCoordinator } from './start-coordinator'
import type { WorkspaceStorage } from './platform-storage'
import type { DurableLifecycle } from './durable'
import type { WorkspaceArchiveState } from './archive-types'
import { CREATE_CHECKPOINT_KEY } from '../members/creation-checkpoint'
import { clearRetention } from './retention-data'
import { readArchiveResource } from './archive-data'
import { startCallInPlace, type StartCall } from './start-guard'

interface Waiter<T> {
  publish(value: T): void
}

export async function recoverArchivedStart(
  db: D1Database,
  workspaceId: string,
  archive: (id: string) => Promise<void>,
  call: StartCall = startCallInPlace,
) {
  const row = await call(() => readArchiveResource(db, workspaceId))
  if (!row || row.archivedAt === null || row.orgDeleted !== null) return false
  await archive(workspaceId)
  return true
}

export async function finishArchivedStart(
  storage: StartJobStorage,
  waiters: Waiter<WorkspaceStartResult>[],
  admission: Waiter<WorkspaceCreationAdmission>,
) {
  const job = await storage.job()
  await storage.stop()
  const result = {
    ok: false,
    error: {
      code: 'workspace_start_stopped',
      message: 'The cloud computer stopped.',
      log: null,
    },
  } as const
  if (job) await storage.complete(job.attempt, result)
  for (const waiter of waiters) waiter.publish(result)
  admission.publish((await storage.admission()) ?? result)
}

export async function prepareArchivedLifecycle(
  input: {
    storage: WorkspaceStorage
    lifecycle: DurableLifecycle
    starts: WorkspaceStartCoordinator
    startJobs: StartJobStorage
    db: D1Database
    now: number
    stopped?: (workspaceId: string) => Promise<void>
  },
  state: WorkspaceArchiveState,
): Promise<WorkspaceArchiveState> {
  await input.starts.archive()
  await input.startJobs.clearPublication()
  await input.stopped?.(state.workspaceId)
  if (!(await input.lifecycle.read())) {
    const checkpoint = await input.storage.get('job', CREATE_CHECKPOINT_KEY)
    await input.storage.put('lifecycle', 'lifecycle:state', {
      workspaceId: state.workspaceId,
      orgId: state.orgId,
      state: 'archived',
      start: null,
      pendingFirstMessage: checkpoint?.creation?.request ?? null,
      lastActivityAt: input.now,
      runningSessions: [],
      runnerConnected: false,
      stoppedAt: state.stoppedAt,
      nextDiskKeepaliveAt: null,
      error: null,
    })
  }
  await input.lifecycle.archive()
  await clearRetention(input.db, state.workspaceId)
  return {
    ...state,
    phase: !state.sandboxId && state.allocation ? 'resolve' : 'stop',
  }
}
