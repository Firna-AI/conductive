import { providerForAccount } from '../sandbox/client'
import { recoverResourceForCleanup } from './allocation-recovery'
import type { ArchiveContext } from './archive-context'
import type { WorkspaceArchiveState } from './archive-types'
import { readWorkspaceAllocation } from './start-allocation'
import { readStartJob } from './start-job-codec'

export async function recoverArchivedAllocation(
  context: Pick<ArchiveContext, 'env' | 'dependencies'>,
  state: WorkspaceArchiveState,
  save: (state: WorkspaceArchiveState) => Promise<void>,
): Promise<WorkspaceArchiveState> {
  if (!state.allocation) return state
  const { env, dependencies } = context
  const job = readStartJob(state.allocation)
  const provider = providerForAccount(
    env,
    dependencies.fetch,
    job.providerAccount,
    'cleanup',
  )
  const input = await readWorkspaceAllocation(env, job)
  const sandbox = await recoverResourceForCleanup(env.DB, provider, {
    kind: 'sandbox',
    mayHaveAllocated: true,
    ownership: {
      orgId: job.orgId,
      providerAccount: job.providerAccount,
      ownerUserId: job.creation?.user.id ?? input.labels?.user ?? null,
      purpose: 'workspace',
      purposeId: job.workspaceId,
    },
    input,
    persist: () => save(state),
  })
  const next: WorkspaceArchiveState = {
    ...state,
    sandboxId: sandbox?.id ?? null,
    providerAccount: job.providerAccount,
    phase: sandbox === null ? 'retained' : 'stop',
    allocation: sandbox === null ? undefined : state.allocation,
  }
  await save(next)
  return next
}
