import type { GitHubSummary } from '../shared/generated/GitHubSummary'
import type { Workspace } from '../shared/generated/Workspace'
import { ready, Store, type Loadable, type Readable } from './store'

/** The GitHub summary of one branch, as the pull request bar shows it. */
export interface LiveGitHub {
  branch: string
  summary: GitHubSummary | null
}

/**
 * The GitHub state that each open workspace screen shows in its pull
 * request bar, by workspace ID. The list mark of such a workspace takes
 * it, so the mark and the bar change together. Without it, the mark waits
 * for the next read of the list, up to 30 seconds later.
 *
 * The bar follows the events of the workspace, and the Worker copies the
 * state to the list only after the event. So the state of the bar is never
 * older than the summary of a list read, and it stays over each read while
 * the screen shows it.
 */
export class LiveGitHubStates {
  private readonly shown = new Store<ReadonlyMap<string, LiveGitHub>>(new Map())
  readonly store: Readable<ReadonlyMap<string, LiveGitHub>> = this.shown

  /**
   * Puts the state of the bar of a workspace over its list summary, until
   * the result runs. A later state of the same workspace replaces it, and
   * the result of an earlier state then changes nothing.
   */
  show(workspaceId: string, state: LiveGitHub): () => void {
    this.shown.change((states) => new Map(states).set(workspaceId, state))
    return () => {
      if (this.shown.get().get(workspaceId) !== state) return
      this.shown.change((states) => {
        const next = new Map(states)
        next.delete(workspaceId)
        return next
      })
    }
  }
}

/**
 * The list with the state of each open bar in place of the list summary of
 * its workspace. A state of another branch than the listed one changes
 * nothing, because the list takes a new branch with its own summary.
 */
export function listWithLiveGitHub(
  list: Loadable<readonly Workspace[]>,
  live: ReadonlyMap<string, LiveGitHub>,
): Loadable<readonly Workspace[]> {
  if (list.state !== 'ready' || live.size === 0) return list
  let changed = false
  const workspaces = list.value.map((workspace) => {
    const state = live.get(workspace.id)
    if (
      !state ||
      state.branch !== workspace.branch ||
      state.summary === workspace.github
    )
      return workspace
    changed = true
    return { ...workspace, github: state.summary }
  })
  return changed ? ready(workspaces) : list
}
