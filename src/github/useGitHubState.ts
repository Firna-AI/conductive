import { useEffect, useMemo, useSyncExternalStore } from 'react'
import type { WorkspaceTarget } from './githubClient'
import { GitHubStore, type GitHubFeed, type GitHubSource } from './githubStore'

/**
 * The GitHub state of one workspace, for the bar, the row, and the Checks
 * tab. Each workspace gets its own store, so one workspace never shows the
 * state of another. Pass stable `fetch` and `subscribe` functions: a new
 * function connects again and reloads.
 */
export function useGitHubState(
  target: WorkspaceTarget,
  source: GitHubSource,
): GitHubFeed {
  const { orgId, workspaceId } = target
  const { fetch, subscribe } = source
  const store = useMemo(
    () => new GitHubStore({ orgId, workspaceId }),
    [orgId, workspaceId],
  )
  useEffect(() => {
    const disconnect = store.connect({ fetch, subscribe })
    void store.load()
    return disconnect
  }, [store, fetch, subscribe])
  const state = useSyncExternalStore(
    store.listen,
    store.getState,
    store.getState,
  )
  return useMemo(() => ({ state, retry: store.retry }), [state, store])
}
