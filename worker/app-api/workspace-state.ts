import type { Workspace } from '../../src/shared/generated/Workspace'

import type { AppEnv } from '../env'
import type { ChatWorkspaceSummary } from '../chat/workspace-summary'
import { HttpError } from '../http'
import { workspaceReadMark } from './shell-data'

export function workspaceBinding(env: AppEnv) {
  if (!env.WORKSPACES)
    throw new HttpError(
      503,
      'workspaces_unavailable',
      'The workspaces are not available. Try again.',
    )
  return env.WORKSPACES
}

export async function workspaceForViewer(
  env: AppEnv,
  userId: string,
  workspace: Workspace,
  readThroughEventNumber?: number,
  suppliedSummary?: ChatWorkspaceSummary,
): Promise<Workspace> {
  if (workspace.archivedAt !== null || workspace.state === 'archived')
    return { ...workspace, state: 'archived' }
  if (workspace.state === 'starting') {
    // The list mark runs its light for a start only while a message waits.
    // An object that runs older code leaves the answer out, which reads as
    // no waiting message.
    const summary = await workspaceBinding(env)
      .getByName(workspace.id, { locationHint: 'weur' })
      .readChatWorkspaceSummary({ messageWaiting: true })
    return { ...workspace, messageWaiting: summary.messageWaiting === true }
  }
  if (
    workspace.state === 'stopped' ||
    workspace.state === 'error' ||
    workspace.state === 'input'
  )
    return workspace
  const [summary, readThrough] = await Promise.all([
    suppliedSummary ??
      workspaceBinding(env)
        .getByName(workspace.id, { locationHint: 'weur' })
        .readChatWorkspaceSummary(),
    readThroughEventNumber === undefined
      ? workspaceReadMark(env.DB, workspace.id, userId)
      : readThroughEventNumber,
  ])
  return {
    ...workspace,
    state: summary.working
      ? 'working'
      : summary.lastOutputEventNumber > readThrough
        ? 'unread'
        : 'ready',
  }
}

export function requireWritableWorkspace(workspace: {
  archivedAt: number | null
  state: string
}): void {
  if (workspace.archivedAt !== null || workspace.state === 'archived')
    throw new HttpError(
      409,
      'workspace_archived',
      'The archived chat is read-only.',
    )
}
