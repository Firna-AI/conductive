import type { ArchiveContext } from './archive-context'
import { CREATE_CHECKPOINT_KEY } from '../members/creation-checkpoint'
import { serializeStartJob } from './start-job-codec'
import { readArchiveResource } from './archive-data'
import {
  ARCHIVE_STATE_KEY,
  ARCHIVE_REVISION_KEY,
  ARCHIVE_RESERVATION_KEY,
  sameArchive,
} from './archive-types'

export async function beginWorkspaceArchive(
  context: ArchiveContext,
  workspaceId: string,
): Promise<{ defer: boolean } | undefined> {
  const { storage, lifecycle, startJobs, env, dependencies } = context
  const row = await readArchiveResource(env.DB, workspaceId)
  if (!row || row.archivedAt === null || row.orgDeleted !== null) return
  const job = await startJobs.job()
  const revision = (await storage.get('number', ARCHIVE_REVISION_KEY)) ?? 0
  let state = await storage.get('archive', ARCHIVE_STATE_KEY)
  if (!state || state.revision !== revision || !sameArchive(row, state)) {
    const current = await lifecycle.read()
    state = {
      revision,
      workspaceId,
      orgId: row.orgId,
      archivedAt: row.archivedAt,
      sandboxId: row.sandboxId ?? job?.allocatedSandboxId ?? null,
      providerAccount: row.providerAccount,
      phase: 'initializing',
      stoppedAt: row.stoppedAt ?? current?.stoppedAt ?? null,
      stopRequestedAt: current?.diskRetentionCommand?.stopRequestedAt,
      allocation: job?.createPayloadCiphertext
        ? serializeStartJob(job)
        : undefined,
    }
    const initial = state
    await storage.transaction(async (transaction) => {
      await transaction.put('archive', ARCHIVE_STATE_KEY, initial)
      await transaction.delete(ARCHIVE_RESERVATION_KEY)
      if (job?.kind === 'create')
        await transaction.put(
          'job',
          CREATE_CHECKPOINT_KEY,
          serializeStartJob({
            ...job,
            commandAttempt: `${job.attempt}:archive:${revision}`,
          }),
        )
      await transaction.setAlarm(dependencies.now())
    })
  }
  return { defer: Boolean(job) }
}
