import { readSavedScript, serializeSavedScript } from './saved-script'
import type { WorkspaceStartJob } from './start-types'

type StoredJob<Job> = Job extends WorkspaceStartJob
  ? Omit<Job, 'startupScript'> & { startupScript: string }
  : never

export type StoredWorkspaceStartJob = StoredJob<WorkspaceStartJob>

/** Native storage and RPC carry plain text, with the admission union intact. */
export function serializeStartJob(
  job: WorkspaceStartJob,
): StoredWorkspaceStartJob {
  return { ...job, startupScript: serializeSavedScript(job.startupScript) }
}

export function readStartJob(job: StoredWorkspaceStartJob): WorkspaceStartJob {
  return { ...job, startupScript: readSavedScript(job.startupScript) }
}
