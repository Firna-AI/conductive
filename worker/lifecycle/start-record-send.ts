import { warnWorker } from '../warnings'
import type { DurableLifecycleState } from './durable-types'
import { jobRunStatement, startStepStatement } from './job-steps'
import type { WorkspaceStorage } from './platform-storage'
import {
  bufferedRows,
  patchSteps,
  readStartRecordMeta,
  recordJobId,
  settleRows,
} from './start-record-buffer'
import { startStepPatches } from './start-record-patches'
import { START_JOB_KEY } from './start-storage'

/** One batch carries at most this many record statements. */
const SEND_LIMIT = 50
/** The end of a start sends at most this many batches. Later sends take the rest. */
const FINAL_BATCHES = 10

type Rows = Awaited<ReturnType<typeof bufferedRows>> & {
  statements: D1PreparedStatement[]
}

/** A record never fails or holds back a start: a failure drops it with a warning. */
export async function recordSafely<T>(
  fallback: T,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation()
  } catch {
    warnWorker({ kind: 'start_record_failed' })
    return fallback
  }
}

/**
 * Sends buffered rows in the batch of a shown-state write. When that batch
 * fails, the state is written again alone, and the rows are dropped, so a
 * bad row never holds back the shown state. A failure of the state write
 * itself still reaches the caller.
 */
export async function sendStartRecords(
  storage: WorkspaceStorage,
  db: D1Database,
  state: DurableLifecycleState,
  write: (records: readonly D1PreparedStatement[]) => Promise<void>,
): Promise<void> {
  const rows = await collect(storage, db, state)
  if (rows.statements.length) {
    try {
      await write(rows.statements)
    } catch {
      warnWorker({ kind: 'start_record_send_failed' })
      await write([])
      return settle(storage, rows, true)
    }
  } else await write([])
  await settle(storage, rows, false)
}

/** The run that ends a start sends the rest of the rows in more batches. */
export async function sendRestStartRecords(
  storage: WorkspaceStorage,
  db: D1Database,
): Promise<void> {
  for (let batch = 0; batch < FINAL_BATCHES; batch++) {
    const rows = await collect(storage, db, undefined)
    if (rows.statements.length) await db.batch(rows.statements)
    await settle(storage, rows, false)
    if (rows.unsent.length < SEND_LIMIT) return
  }
}

/** The steps of a lifecycle state join the buffer while its start job runs. */
function collect(
  storage: WorkspaceStorage,
  db: D1Database,
  state: DurableLifecycleState | undefined,
): Promise<Rows> {
  return recordSafely({ unsent: [], stale: [], statements: [] }, async () => {
    const job = await storage.get('job', START_JOB_KEY)
    const start = state?.start
    if (job && start)
      await storage.transaction(async (transaction) => {
        const meta = await readStartRecordMeta(transaction)
        if (meta?.jobId === recordJobId(job))
          await patchSteps(transaction, meta, startStepPatches(start, meta))
      })
    const rows = await bufferedRows(
      storage,
      job ? recordJobId(job) : null,
      SEND_LIMIT,
    )
    return {
      ...rows,
      statements: rows.unsent.map(([, entry]) =>
        entry.kind === 'step'
          ? startStepStatement(db, entry.record)
          : jobRunStatement(db, entry.record),
      ),
    }
  })
}

async function settle(
  storage: WorkspaceStorage,
  rows: Rows,
  dropped: boolean,
): Promise<void> {
  if (!rows.unsent.length && !rows.stale.length) return
  await recordSafely(undefined, () =>
    storage.transaction(async (transaction) => {
      const job = await transaction.get('job', START_JOB_KEY)
      await settleRows(
        transaction,
        rows,
        job ? recordJobId(job) : null,
        dropped,
      )
    }),
  )
}
