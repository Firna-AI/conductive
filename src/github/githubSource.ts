import type { Delay } from '../app/events'
import type { WorkspaceSocketMessage } from '../shared/events'
import type { FetchLike } from './githubClient'

/**
 * The event stream of one workspace after `afterEventNumber`. It sends the
 * stored history first, in one or more `history` pages, then live events.
 * The pages of one replay share one cutoff, and a page can leave out event
 * numbers. A page with more to come has `hasMore` and `nextAfterEventNumber`.
 * The returned function ends the subscription.
 * @public The workspace GitHub adapter imports this subscription boundary.
 */
export type SubscribeToWorkspace = (
  afterEventNumber: number,
  listener: (message: WorkspaceSocketMessage) => void,
) => () => void

export interface GitHubSource {
  fetch: FetchLike
  subscribe: SubscribeToWorkspace
  /** Runs the next fresh read later: `AppServices.delay` in the app. */
  delay: Delay
}

/**
 * The wait before the next fresh read of an open workspace, in ms. GitHub
 * events keep the state current, so these reads only catch a change that no
 * webhook names. Each read costs GitHub API calls in every open tab, so the
 * wait is long. It is a choice of the app, not a product limit.
 */
export const freshReadWait = 300_000
