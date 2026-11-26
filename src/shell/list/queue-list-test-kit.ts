import type { Workspace } from '../../shared/generated/Workspace'
import { joinRefusalText } from '../../ui/components/workspace/queueCopy'
import { queueBlocks } from '../../app/merge-queue'
import { joinCheck } from '../../app/merge-queue-join'
import { groupWorkspaces } from '../../app/sections'
import { coreFixtures, FAKE_TIME } from '../../test-support/fixtures/core'
import { withMergeQueue } from '../../test-support/fixtures/merge-queue'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { placeAt, rowLink } from './row-drag-test-kit'
import type { QueueList } from './useQueueGroup'

// The helpers of the tests of the Merge queue group of a list.

const queueRepositories = [
  { id: 'storefront', fullName: 'acme/storefront', defaultBranch: 'main' },
  {
    id: 'billing-service',
    fullName: 'acme/billing-service',
    defaultBranch: 'main',
  },
]

/** A write of the queue that a test records. */
export type QueueWrite =
  | { kind: 'add'; workspaceId: string }
  | { kind: 'move'; workspaceId: string; before: string | null }

/**
 * The groups of the fake list of Acme with `units` queued, and the queue
 * of a list with the real rules, whose writes go to `writes`.
 */
export function queuedList(
  units: readonly (readonly string[])[],
  writes: QueueWrite[] = [],
) {
  const workspaces = withMergeQueue(
    workspaceFixtures().workspaces.workspaces,
    units,
  )
  const groups = groupWorkspaces(
    coreFixtures().sectionList.sections,
    workspaces,
    FAKE_TIME,
  )
  const facts = { workspaces, repositories: queueRepositories }
  const queue: QueueList = {
    blocks: queueBlocks(groups.queued, queueRepositories),
    refusal: (workspace: Workspace) => {
      const check = joinCheck(workspace, facts)
      return check.kind === 'refused' ? joinRefusalText(check.refusal) : null
    },
    mayMove: (workspace) => workspace.githubCanWrite === true,
    add: (workspace) => writes.push({ kind: 'add', workspaceId: workspace.id }),
    move: (workspaceId, before) =>
      writes.push({ kind: 'move', workspaceId, before }),
  }
  return { groups, queue, workspaces }
}

/**
 * Gives the Merge queue group a box from `top` that is `height` px high,
 * its first block the same box, and each of its rows a box 20 px high, in
 * this order, from 20 px below the top of the group.
 */
export function layOutGroup(
  view: HTMLElement,
  top: number,
  workspaceIds: readonly string[],
  height = 100,
) {
  placeAt(view.querySelector('section[aria-label="Merge queue"]'), top, height)
  placeAt(
    view.querySelector('ol[aria-label^="Merge queue"]')?.parentElement ?? null,
    top,
    height,
  )
  workspaceIds.forEach((workspaceId, index) =>
    placeAt(
      rowLink(view, workspaceId).parentElement,
      top + 20 + index * 20,
      20,
    ),
  )
}
