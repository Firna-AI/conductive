import { useCallback, useMemo } from 'react'
import { useWorkspaceStore } from '../app/workspace-store'
import type { WorkspaceTarget } from './githubClient'
import { GitHubStore, type GitHubFeed, type GitHubSource } from './githubStore'

function createStore(target: WorkspaceTarget): GitHubStore {
  return new GitHubStore(target)
}

/**
 * The GitHub state of one workspace, for the bar, the row, and the Checks
 * tab. Each workspace gets its own store, so one workspace never shows the
 * state of another. While a view shows it, the store reads it again on a
 * slow timer of `source.delay`. Pass stable `fetch`, `subscribe`, and
 * `delay` functions: a new function connects again and reloads.
 */
export function useGitHubState(
  target: WorkspaceTarget,
  source: GitHubSource,
): GitHubFeed {
  const { fetch, subscribe, delay } = source
  const connect = useCallback(
    (store: GitHubStore) => store.connect({ fetch, subscribe, delay }),
    [fetch, subscribe, delay],
  )
  const { store, snapshot } = useWorkspaceStore(target, {
    create: createStore,
    connect,
  })
  return useMemo(
    () => ({ state: snapshot, retry: store.retry }),
    [snapshot, store],
  )
}
