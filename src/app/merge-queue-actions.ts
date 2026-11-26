import type { ReorderMergeQueue } from '../shared/generated/ReorderMergeQueue'
import { mergeQueuePaths } from '../shared/merge-queue'
import { ignore } from './api/parse'
import { queueJoined, queueLeft, queueMoved } from './merge-queue-changes'
import type { ListChange } from './list-changes'
import type { OrgModel } from './org-model'

/*
 * The writes of the merge queue. Each one shows at once and goes back when
 * it fails, as a move of the list does, so the caller names the failure.
 * After an answer, the list reads again, because the Worker can change
 * more entries than the change shows, such as the lower pull requests of a
 * member stack that Add also adds. The model counts the write, so the bar
 * of the open workspace reads its place again.
 */

async function queueWrite(
  org: OrgModel,
  change: ListChange,
  send: () => Promise<void>,
): Promise<void> {
  await org.resources.list.write(change, send, () => change)
  void org.rereadList()
  org.queueWritten()
}

/** Add to merge queue: the workspace joins at the top of the stack. */
export function addToMergeQueue(
  org: OrgModel,
  workspaceId: string,
): Promise<void> {
  return queueWrite(org, queueJoined(workspaceId), () =>
    org.services.api.send(
      'POST',
      mergeQueuePaths.entry(org.orgId, workspaceId),
      {},
      ignore,
    ),
  )
}

/**
 * Remove from queue, after its question. The entries above the workspace
 * in its member stack leave too.
 */
export function removeFromMergeQueue(
  org: OrgModel,
  workspaceId: string,
): Promise<void> {
  return queueWrite(org, queueLeft(workspaceId), () =>
    org.services.api.send(
      'DELETE',
      mergeQueuePaths.entry(org.orgId, workspaceId),
      {},
      ignore,
    ),
  )
}

/**
 * Moves the unit of a workspace before the unit of `beforeWorkspaceId` in
 * its queue, or to the end with null, as a drop or the keys do.
 */
export function moveInMergeQueue(
  org: OrgModel,
  workspaceId: string,
  beforeWorkspaceId: string | null,
): Promise<void> {
  const body: ReorderMergeQueue = { beforeWorkspaceId }
  return queueWrite(org, queueMoved(workspaceId, beforeWorkspaceId), () =>
    org.services.api.send(
      'PUT',
      mergeQueuePaths.order(org.orgId, workspaceId),
      body,
      ignore,
    ),
  )
}
