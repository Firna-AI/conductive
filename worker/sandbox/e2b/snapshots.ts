import { ProviderError } from '../errors'
import type { SavedSnapshot } from '../provider'
import type { E2bContext } from './context'
import {
  definitiveFailure,
  preflightRefusal,
  invalidResponse,
  pendingOperation,
  replayRejection,
} from './errors'
import { inventoryMatch } from './inventory'
import { snapshotMatch } from './parsers'
import {
  claimSnapshot,
  completeSnapshot,
  deleteSnapshotRecord,
  readSnapshotRecord,
  rejectSnapshot,
  retireAbsentSnapshot,
} from './snapshot-data'

export async function getSnapshot(
  context: E2bContext,
  name: string,
): Promise<SavedSnapshot> {
  const row = await readSnapshotRecord(context.db, context.accountId, name)
  if (!row || row.state === 'deleted') throw new ProviderError('not_found', 404)
  if (row.state === 'retryable') throw new ProviderError('not_found', 404)
  if (row.state === 'rejected' && preflightRefusal(row.rejectionStatus))
    return replayRejection(row)
  const id = await inventoryMatch(
    context.control,
    'listSnapshots',
    new URLSearchParams({ sandboxID: row.sourceSandboxId, name }),
    (value) => snapshotMatch(value, name),
  )
  if (!id) {
    if (row.state === 'ready') throw new ProviderError('not_found', 404)
    return { name, sourceSandboxId: row.sourceSandboxId, status: 'saving' }
  }
  if (row.snapshotId && row.snapshotId !== id) return invalidResponse()
  await completeSnapshot(context.db, context.accountId, name, id)
  return { name, sourceSandboxId: row.sourceSandboxId, status: 'ready' }
}

export async function saveSnapshot(
  context: E2bContext,
  sandboxId: string,
  name: string,
): Promise<SavedSnapshot> {
  const previous = await readSnapshotRecord(context.db, context.accountId, name)
  const sourceSandboxId = previous?.sourceSandboxId || sandboxId
  if (!(await claimSnapshot(context.db, context.accountId, name, sandboxId)))
    return getSnapshot(context, name)
  let id: string
  try {
    const reply = await context.control.request(
      { operation: 'saveSnapshot', sandboxId: sourceSandboxId },
      { body: { name, memory: false } },
    )
    id = snapshotMatch(reply.value, name) ?? invalidResponse()
  } catch (error) {
    if (definitiveFailure(error))
      await rejectSnapshot(
        context.db,
        context.accountId,
        name,
        error,
        error.retryable,
      )
    else if (error instanceof ProviderError && error.kind === 'unavailable')
      return getSnapshot(context, name)
    throw error
  }
  await completeSnapshot(context.db, context.accountId, name, id)
  return { name, sourceSandboxId, status: 'ready' }
}

export async function deleteSnapshot(
  context: E2bContext,
  name: string,
): Promise<void> {
  if (await retireAbsentSnapshot(context.db, context.accountId, name)) return
  let row = await readSnapshotRecord(context.db, context.accountId, name)
  if (!row || row.state === 'deleted') return
  if (!row.snapshotId) {
    const snapshot = await getSnapshot(context, name)
    if (snapshot.status === 'saving') return pendingOperation()
    row = await readSnapshotRecord(context.db, context.accountId, name)
  }
  if (!row?.snapshotId) return invalidResponse()
  try {
    await context.control.request({
      operation: 'deleteSnapshot',
      snapshotId: row.snapshotId,
    })
  } catch (error) {
    if (!(error instanceof ProviderError && error.kind === 'not_found'))
      throw error
  }
  await deleteSnapshotRecord(context.db, context.accountId, name)
}
