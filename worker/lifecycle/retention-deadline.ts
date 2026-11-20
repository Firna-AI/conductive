import { JobTimeLimit } from './job-time-limit'
import { readRetention, setRetention } from './retention-data'

/** This local deadline transition makes no provider request. */
export async function expireRetentionDeadline(
  db: D1Database,
  workspaceId: string,
): Promise<string | null> {
  const progress = await readRetention(db, workspaceId)
  if (!progress || progress.phase === 'stop') return progress?.error ?? null
  const error = new JobTimeLimit('start').message
  await setRetention(db, workspaceId, 'stop', error)
  return error
}
