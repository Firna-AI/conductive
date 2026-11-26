import type { WorkspaceFiles } from '../files/workspace'
import { readContinueWork } from '../lifecycle/continue-work'
import { readWorkspace } from '../lifecycle/workspace-data'
import type { QueueRuntime } from './step'

export interface QueueLocalWork {
  orgId: string
  workspaceId: string
  repositoryId: string
  branch: string
  userId: string
}

export type QueueLocalState = 'clean' | 'dirty' | 'unavailable'

export async function queueLocalClean(
  runtime: QueueRuntime,
  files: WorkspaceFiles,
  input: QueueLocalWork,
): Promise<QueueLocalState> {
  const { env, dependencies } = runtime
  const current = () => readWorkspace(env.DB, input.orgId, input.workspaceId)
  const matches = (row: Awaited<ReturnType<typeof current>>) =>
    row.repositoryId === input.repositoryId &&
    row.branch === input.branch &&
    row.archivedAt === null &&
    row.state !== 'archived' &&
    row.state !== 'starting'
  const row = await current()
  if (!matches(row)) return 'unavailable'
  if (!row.sandboxId) return 'clean'
  let clean: boolean
  if (row.state === 'stopped' || row.state === 'error') {
    const changes = await files.changes()
    if (!changes) return 'unavailable'
    clean =
      changes.unpushedCommits === 0 &&
      changes.uncommittedFileCount === 0 &&
      changes.files.every((file) => !file.uncommitted)
  } else {
    const work = await readContinueWork(
      env,
      dependencies,
      input.orgId,
      row.id,
      input.userId,
    )
    clean = work.unpushedCommits === 0 && work.uncommittedFiles.length === 0
  }
  const latest = await current()
  if (
    !matches(latest) ||
    latest.sandboxId !== row.sandboxId ||
    latest.state !== row.state
  )
    return 'unavailable'
  return clean ? 'clean' : 'dirty'
}
