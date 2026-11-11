import type { WorkspaceStorage } from './platform-storage'
import type {
  WorkspaceStartResult,
  WorkspaceCreationAdmission,
} from './start-types'
import { taskWorkspaceTransaction } from './workspace-task-alarms'
import { IMPORT_CHECKPOINT_KEY as IMPORT_CHECKPOINT } from './import-activation-cleanup'

interface CompletionKeys {
  job: string
  result: string
  creation: string
  publication: string
}

export async function completeStoredStart(
  storage: WorkspaceStorage,
  keys: CompletionKeys,
  now: () => number,
  result: WorkspaceStartResult,
): Promise<void> {
  const {
    job: JOB,
    result: RESULT,
    creation: CREATE_RESULT,
    publication: PUBLICATION,
  } = keys
  await storage.transaction(async (transaction) => {
    const current = await transaction.get('job', JOB)
    if (!current || (current.cancelled && result.ok)) return
    const stored = result.ok
      ? result
      : { ...result, error: { ...result.error, log: null } }
    await transaction.put('result', RESULT, stored)
    if (current.kind === 'activate') {
      await transaction.put('job', IMPORT_CHECKPOINT, current)
      if (current.activation.cleanupPending)
        await taskWorkspaceTransaction(
          transaction,
          'lifecycle:publication',
        ).setAlarm(now())
    }
    if (current.kind === 'create') {
      let admission: WorkspaceCreationAdmission
      if (current.phase === 'records') {
        if (stored.ok) throw new Error('A create completed before admission')
        admission = stored
      } else admission = { ok: true, created: current.admission }
      await transaction.put('creation', CREATE_RESULT, {
        result: stored,
        admission,
      })
      await transaction.put('publication', PUBLICATION, {
        workspaceId: current.workspaceId,
        state: result.ok ? 'succeeded' : 'failed',
      })
      await taskWorkspaceTransaction(
        transaction,
        'lifecycle:publication',
      ).setAlarm(now() + 30_000)
    }
    await transaction.delete(JOB)
    await taskWorkspaceTransaction(transaction, 'lifecycle:start').deleteAlarm()
  })
}
