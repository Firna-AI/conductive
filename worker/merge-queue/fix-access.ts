import { readMergeWorkspace } from '../github/merge-access'
import { readQueueWriteAccess } from '../github/merge-capabilities'
import { repositoryMemberGitHub } from '../github/member-github'
import { HttpError } from '../http'
import { toolUser } from '../tools/composition-data'
import type { QueueLeave, QueueRecord } from './contracts'
import { queueMissing } from './errors'
import type { QueueFixRequest } from './fix-contracts'
import { currentFixEntry } from './fix-data'
import type { QueueRuntime } from './step'
import { staleQueueEntries } from './step-data'

async function readFixWorkspace(db: D1Database, fix: QueueFixRequest) {
  const { scope, entry } = fix
  const workspace = await readMergeWorkspace(
    db,
    scope.orgId,
    entry.workspaceId,
    entry.queuerUserId,
  )
  if (
    workspace.repositoryId !== scope.githubRepositoryId ||
    workspace.branch !== entry.branch ||
    !(await currentFixEntry(db, fix))
  )
    throw queueMissing()
  return workspace
}

/** Recheck the live binding inside the workspace's chat sequence. */
export async function queueFixSender(db: D1Database, fix: QueueFixRequest) {
  await readFixWorkspace(db, fix)
  return toolUser(db, fix.scope.orgId, fix.entry.queuerUserId)
}

export async function queueFixAccess(
  runtime: QueueRuntime,
  fix: QueueFixRequest,
): Promise<'write' | 'lost' | 'token'> {
  const { env, dependencies } = runtime
  try {
    const workspace = await readFixWorkspace(env.DB, fix)
    const member = await repositoryMemberGitHub(
      env,
      dependencies,
      workspace,
      fix.entry.queuerUserId,
    )
    return (await member.checked(() =>
      readQueueWriteAccess(member.fetch, member.token, workspace),
    ))
      ? 'write'
      : 'lost'
  } catch (error) {
    if (
      error instanceof HttpError &&
      ['github_reconnect_required', 'github_refresh_failed'].includes(
        error.code,
      )
    )
      return 'token'
    throw error
  }
}

/** Resolve access changes that can race a GitHub read or chat admission. */
export async function queueFixLeave(
  db: D1Database,
  queue: QueueRecord,
  fix: QueueFixRequest,
  error: HttpError,
): Promise<QueueLeave | undefined> {
  const { workspaceId, branch, pullNumber } = fix.entry
  if (error.code === 'org_suspended') return { cause: 'org-suspended' }
  if (error.code === 'workspace_archived')
    return { cause: 'archived', workspaceId, branch, pullNumber }
  if (error.code === 'membership_required')
    return { cause: 'queuer-left', workspaceId, branch, pullNumber }
  if (
    error.code === 'workspace_not_found' ||
    error.code === queueMissing().code
  )
    return (await staleQueueEntries(db, queue)).find(
      (signal) => signal.workspaceId === workspaceId,
    )
}
