import { DEFAULT_PROVIDER_ACCOUNT } from '../sandbox/account-identity'
import { readSavedScript, serializeSavedScript } from './saved-script'
import type { WorkspaceStartJob } from './start-types'
import { readProviderRetry } from './provider-retry'

type StoredJob<Job> = Job extends WorkspaceStartJob
  ? Omit<Job, 'startupScript' | 'providerAccount'> & {
      startupScript: string
      providerAccount?: string
    }
  : never

export type StoredWorkspaceStartJob = StoredJob<WorkspaceStartJob>

/** Native storage and RPC carry plain text, with the admission union intact. */
export function serializeStartJob(
  job: WorkspaceStartJob,
): StoredWorkspaceStartJob {
  return { ...job, startupScript: serializeSavedScript(job.startupScript) }
}

export function readStartJob(job: StoredWorkspaceStartJob): WorkspaceStartJob {
  return {
    ...job,
    providerAccount: job.providerAccount ?? DEFAULT_PROVIDER_ACCOUNT,
    startupScript: readSavedScript(job.startupScript),
    providerRetry:
      job.providerRetry === undefined
        ? undefined
        : readProviderRetry(job.providerRetry),
  }
}
