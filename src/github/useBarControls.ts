import { useCallback, useMemo, useSyncExternalStore } from 'react'
import type { BarAction } from '../ui/components/workspace/barModel'
import { useWorkspaceStore } from '../app/workspace-store'
import { BarActions } from './barActions'
import type { BarActionsPorts } from './barPorts'
import { promptOf, resolveConflictsPrompt } from './barPrompts'
import { barViewOf, type BarControls, type LocalWork } from './barView'
import type { WorkspaceTarget } from './githubClient'
import type { GitHubFeed } from './githubStore'
import type { QueueInput } from './queueView'

function connectBar(actions: BarActions): () => void {
  return actions.connect()
}

/**
 * The one action store of the bar of a workspace, for the desktop bar and
 * the top of the phone Checks tab. Keep `ports` stable: a new function, a
 * new workspace, or a new member makes a new store, so no access, run, or
 * outcome of another one stays.
 */
export function useBarActions(
  target: WorkspaceTarget,
  ports: (target: WorkspaceTarget) => BarActionsPorts,
): BarActions {
  const create = useCallback(
    (workspace: WorkspaceTarget) => new BarActions(ports(workspace)),
    [ports],
  )
  return useWorkspaceStore(target, { create, connect: connectBar }).store
}

/** What the bar actions read beside the GitHub state and their store. */
export interface BarScreen {
  /** The GitHub state of the workspace branch. */
  github: GitHubFeed
  actions: BarActions
  localWork: LocalWork
  /** A turn runs in a session of the workspace. */
  turnRuns: boolean
  /** An archived workspace or a suspended org: only links show. */
  readOnly: boolean
  /**
   * Archives the workspace at once, with no question, or null when the
   * member may not archive.
   */
  archive: (() => void) | null
  /** The Archive of the workspace runs, so its button shows busy. */
  archiving: boolean
  /**
   * Shows the chat when a prompt did not go out, so the reason shows: the
   * session whose composer names a missing login or a failed send, or the
   * chat without an open session. A sent prompt keeps the view.
   * The caller uses only a result from the connection of the press.
   */
  showChat: () => void
  /**
   * The merge queue of the workspace, from the list of the org: its facts,
   * Add to merge queue, and Remove from queue, which asks first. Without
   * it, the bar shows no part of the queue.
   */
  queue?: {
    input: QueueInput
    add: () => void
    remove: () => void
  }
}

/**
 * The view and the presses of the bar actions, or null while no GitHub
 * state shows. An agent action sends the prompt of the state that shows,
 * Merge merges its head, Ready for review marks the draft ready, and Continue starts from the branch of the bar.
 */
export function useBarControls(screen: BarScreen): BarControls | null {
  const { github, actions, localWork, turnRuns, readOnly } = screen
  const { archive, archiving, showChat, queue } = screen
  const shown = useSyncExternalStore(actions.subscribe, actions.getSnapshot)
  const { state } = github
  return useMemo(() => {
    if (state.status !== 'ready') return null
    const { snapshot } = state
    const onAction = (action: BarAction) => {
      switch (action.kind) {
        case 'agent':
          void actions
            .sendPrompt(
              action.action === 'resolve-conflicts'
                ? (stored) => resolveConflictsPrompt(snapshot, stored)
                : promptOf(action.action, snapshot),
            )
            .then((result) => {
              if (result !== null && result !== 'sent') showChat()
            })
          return
        case 'merge':
          if (!action.busy && (!queue?.input.listed || snapshot.queue))
            void actions.merge(snapshot)
          return
        case 'ready':
          void actions.markReady(snapshot)
          return
        case 'continue':
          void actions.continueWorkspace()
          return
        case 'archive':
          archive?.()
          return
      }
    }
    const view = barViewOf({
      snapshot,
      capabilities: shown.capabilities,
      localWork,
      outcome: shown.outcome,
      turnRuns,
      readOnly,
      archivable: archive !== null,
      archiving,
      ...(queue && { queue: queue.input }),
    })
    const onQueue = (action: 'add' | 'remove') => {
      if (action === 'add') queue?.add()
      else queue?.remove()
    }
    return { view, onAction, onQueue }
  }, [
    state,
    shown,
    localWork,
    turnRuns,
    readOnly,
    archive,
    archiving,
    actions,
    showChat,
    queue,
  ])
}
