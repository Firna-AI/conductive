import { useEffect, useMemo, useRef, useState } from 'react'
import { isQueued, type QueueMenuAction } from '../../../app/merge-queue'
import { joinCheck, queueMenuAction } from '../../../app/merge-queue-join'
import { useStore, valueOf } from '../../../app/store'
import type { GitHubFeed } from '../../../github/githubStore'
import type { QueueInput } from '../../../github/queueView'
import { useOrgModel } from '../../context'
import { RemoveQueueDialog } from '../../list/RemoveQueueDialog'
import { removeQuestionOf, type RemoveQuestion } from '../../list/row-queue'
import { useListQueue } from '../../list/useListQueue'
import type { WorkspaceContext } from '../features'
import { useGitHubFeed, useScreenBar } from './WorkspaceGitHub'

/** What the screen of a workspace knows for the question of Remove from queue. */
type Known = { number?: number }

/** The number of the pull request, from the bar. */
function knownOf(feed: GitHubFeed | null): Known {
  const state = feed?.state
  if (state?.status !== 'ready') return {}
  const { banner } = state.snapshot
  return {
    ...(banner.pullRequest && { number: banner.pullRequest.number }),
  }
}

/**
 * What the bar of the open workspace knows for the question of Remove from
 * queue of the menu of its header: the number of its pull request.
 * Another workspace gets nothing.
 */
export function useQueueKnown(workspaceId: string): (id: string) => Known {
  const known = knownOf(useGitHubFeed())
  return (id) => (id === workspaceId ? known : {})
}

/** The merge queue of the open workspace, for its bar and its palette. */
export interface WorkspaceQueue {
  /** The item of the menu of the workspace: Add, Remove, or none. */
  readonly menu: QueueMenuAction | undefined
  /** The facts of the bar, from the list of the org. */
  readonly input: QueueInput
  readonly add: () => void
  /** Asks the question of Remove from queue. */
  readonly remove: () => void
  /** The question of Remove from queue, while it is open. */
  readonly question: RemoveQuestion | null
  readonly cancel: () => void
  readonly confirm: (workspaceId: string) => void
}

/**
 * The merge queue of the open workspace, from the list of the org: the
 * item that its menu and the palette offer, the facts of its bar, and the
 * writes, with the question of Remove from queue. The bar reads again
 * after each write of the queue that worked in this tab, also from the
 * list, and when a read of the list shows another entry of the workspace,
 * so its line and Add to merge queue follow the queue. A read-only
 * workspace offers no action of the queue.
 */
export function useWorkspaceQueue(
  context: WorkspaceContext,
  feed: GitHubFeed,
): WorkspaceQueue {
  const model = useOrgModel(context.org.id)
  const workspaces = valueOf(useStore(model.workspaces)) ?? []
  const queued = workspaces.filter(isQueued)
  const queue = useListQueue(model, workspaces, queued)
  const [question, setQuestion] = useState<RemoveQuestion | null>(null)
  const [adding, setAdding] = useState(false)
  const { id } = context.workspace
  const listed = workspaces.find((item) => item.id === id)
  const readOnly = context.readOnly
  const menu =
    listed && !readOnly ? queueMenuAction(listed, queue.facts) : undefined
  const canJoin =
    listed !== undefined &&
    !readOnly &&
    joinCheck(listed, queue.facts).kind === 'can-join'
  const listedEntry = listed?.mergeQueue !== undefined
  const input = useMemo(
    () => ({ listed: listedEntry, canJoin, adding }),
    [listedEntry, canJoin, adding],
  )
  // The writes read the latest render, so the value changes only with the
  // facts that the views show.
  const latest = useRef({ id, listed, queue, feed, readOnly })
  useEffect(() => {
    latest.current = { id, listed, queue, feed, readOnly }
  })
  // The bar reads its place again after a write of the queue, and after a
  // read of the list that shows another entry of the workspace.
  const written = useStore(model.queueWrites)
  const entry = listed?.mergeQueue
  const shown = entry ? `${entry.queueId} ${entry.place} ${entry.state}` : ''
  const lastRead = useRef({ written, shown })
  useEffect(() => {
    const last = lastRead.current
    if (last.written === written && last.shown === shown) return
    lastRead.current = { written, shown }
    latest.current.feed.retry()
  }, [written, shown])
  const running = useRef(false)
  const writes = useMemo(
    () => ({
      add: () => {
        const current = latest.current
        if (running.current || current.readOnly) return
        running.current = true
        setAdding(true)
        void current.queue.add(current.id).then(() => {
          running.current = false
          setAdding(false)
        })
      },
      remove: () => {
        const { listed, queue, feed, readOnly } = latest.current
        if (!listed || readOnly) return
        setQuestion(removeQuestionOf(listed, queue.facts, knownOf(feed)))
      },
      cancel: () => setQuestion(null),
      confirm: (workspaceId: string) => {
        void latest.current.queue.remove(workspaceId)
      },
    }),
    [],
  )
  return useMemo(
    () => ({ menu, input, question, ...writes }),
    [menu, input, question, writes],
  )
}

/** The question of Remove from queue of the bar and of the palette. */
export function QueueQuestion() {
  const queue = useScreenBar()?.queue
  if (!queue?.question) return null
  return (
    <RemoveQueueDialog
      close={queue.cancel}
      confirm={queue.confirm}
      question={queue.question}
    />
  )
}
