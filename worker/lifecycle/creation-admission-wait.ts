import { JobTimeLimit } from './job-time-limit'
import type { StartJobStorage, WorkspaceCreationAdmission } from './start-types'
import type { StartWaiters } from './start-waiters'

export function waitCreationAdmission(
  storage: Pick<StartJobStorage, 'admission' | 'creationResult'>,
  waiters: StartWaiters<WorkspaceCreationAdmission>,
  timeoutMs?: number,
): Promise<WorkspaceCreationAdmission> {
  const failure = new JobTimeLimit('start')
  return waiters.wait(
    async () => {
      const admission = await storage.admission()
      if (admission) return admission
      const completed = await storage.creationResult()
      return completed && !completed.ok
        ? { ...completed, error: { ...completed.error, log: null } }
        : undefined
    },
    timeoutMs === undefined
      ? undefined
      : {
          milliseconds: timeoutMs,
          result: {
            ok: false,
            error: {
              code: failure.code,
              message: failure.message,
              log: null,
            },
          },
        },
  )
}
