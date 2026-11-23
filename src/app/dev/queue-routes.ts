import type { MergeQueueBarState } from '../../shared/generated/MergeQueueBarState'
import type { Workspace } from '../../shared/generated/Workspace'
import { githubPaths } from '../../shared/github'
import { mergeQueuePaths } from '../../shared/merge-queue'
import {
  billingQueue,
  storefrontQueue,
  withMergeQueue,
} from '../../test-support/fixtures/merge-queue'
import type { FetchLike } from '../api/client'
import { record } from '../api/parse'
import { byPlace, isQueued } from '../merge-queue'
import { queueJoined, queueLeft, queueMoved } from '../merge-queue-changes'
import type { ListChange } from '../list-changes'
import { requireOrg, requireWorkspace, type DevBackend } from './backend'
import { ID, json, noContent, RouteError, type Route } from './router'
import type { OrgState } from './state'

/**
 * The merge queue of the dev fake: `open` queues nothing, `one` queues four
 * workspaces of acme/storefront, as the mockup page `app/merge-queue`
 * draws them, and `two` also queues a member stack of
 * acme/billing-service. With each value, each workspace with an open pull
 * request gets write access and a pull request into main, except
 * `invoice-fonts`, which targets a release branch, so its drag names the
 * reason that it cannot join. Without the option, no record has a field of
 * the queue, as from a Worker without the queue.
 */
export type DevQueue = 'open' | 'one' | 'two'

const queues: Readonly<Record<DevQueue, readonly (readonly string[])[]>> = {
  open: [],
  one: storefrontQueue,
  two: [...storefrontQueue, ...billingQueue],
}

/** Gives the workspaces of Acme the fields of the queue of `option`. */
export function seedMergeQueue(org: OrgState, option: DevQueue | null): void {
  if (option !== null)
    org.workspaces = withMergeQueue(org.workspaces, queues[option])
}

/** The queue state of the bar of a queued workspace, as the Worker reads it. */
function barState(org: OrgState, workspace: Workspace): MergeQueueBarState {
  const entries = org.workspaces
    .filter(
      (item) => item.repositoryId === workspace.repositoryId && isQueued(item),
    )
    .sort(byPlace)
  const at = entries.findIndex((item) => item.id === workspace.id)
  const below = entries[at - 1]
  const base = below?.branch ?? 'main'
  return {
    place: at + 1,
    count: entries.length,
    belowPullNumber: below?.mergeQueue?.pullNumber ?? null,
    ...(entries
      .slice(0, at + 1)
      .every(({ github }) => github === 'ready-to-merge') && {
      mergeAhead: at,
    }),
    trunk: 'main',
    trunkLabel: { text: 'main' },
    rebase: { base, label: { text: base } },
    state: workspace.mergeQueue?.state ?? 'queued',
    wait: null,
  }
}

/** A change of the queue that applies as the Worker answers it. */
function change(org: OrgState, list: ListChange): Response {
  org.workspaces = list({
    sections: org.sections,
    workspaces: org.workspaces,
  }).workspaces
  return noContent()
}

/** The routes of the fake queue and the bar of an entry. */
export function queueRoutes(backend: DevBackend, recorded: FetchLike): Route[] {
  const orgOf = (org: string) => requireOrg(backend.state, org)
  const entry = mergeQueuePaths.entry(ID.org, ID.workspace)
  return [
    {
      method: 'POST',
      path: entry,
      answer: ({ params }) => {
        const org = orgOf(params.org)
        const workspace = requireWorkspace(org, params.workspace)
        if (workspace.githubPullBase !== 'main')
          throw new RouteError(
            409,
            'merge_queue_wrong_base',
            'The bottom pull request must target the default branch.',
          )
        return change(org, queueJoined(workspace.id))
      },
    },
    {
      method: 'DELETE',
      path: entry,
      answer: ({ params }) =>
        change(orgOf(params.org), queueLeft(params.workspace)),
    },
    {
      method: 'PUT',
      path: mergeQueuePaths.order(ID.org, ID.workspace),
      answer: ({ params, body }) => {
        const before = record(body).beforeWorkspaceId
        const target = typeof before === 'string' ? before : null
        return change(orgOf(params.org), queueMoved(params.workspace, target))
      },
    },
    {
      method: 'POST',
      path: mergeQueuePaths.merge(ID.org, ID.workspace),
      answer: ({ params, body }) => {
        const org = orgOf(params.org)
        const workspace = requireWorkspace(org, params.workspace)
        const { mergeAhead } = barState(org, workspace)
        if (
          !isQueued(workspace) ||
          mergeAhead === undefined ||
          mergeAhead !== record(body).ahead
        )
          throw new RouteError(
            409,
            'merge_queue_not_ready',
            'This pull request and the ones ahead must be ready in the GitHub stack.',
          )
        org.workspaces = org.workspaces.map((item) =>
          item.repositoryId === workspace.repositoryId &&
          item.mergeQueue &&
          item.mergeQueue.place <= mergeAhead + 1
            ? { ...item, mergeQueue: { ...item.mergeQueue, state: 'merging' } }
            : item,
        )
        return new Response(null, { status: 202 })
      },
    },
    {
      method: 'GET',
      path: githubPaths.banner(ID.org, ID.workspace),
      answer: ({ params }) => {
        const org = orgOf(params.org)
        const workspace = requireWorkspace(org, params.workspace)
        if (!isQueued(workspace)) return null
        const path = githubPaths.banner(params.org, params.workspace)
        // The recorded server answers the bar of `checkout-autocomplete`.
        return recorded(path).then(async (reply) => {
          if (!reply.ok) return reply
          const body = record(await reply.json())
          return json({ ...body, queue: barState(org, workspace) })
        })
      },
    },
  ]
}
