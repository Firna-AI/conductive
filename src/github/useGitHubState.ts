import { useCallback, useMemo } from 'react'
import type { Readable } from '../app/store'
import { useWorkspaceStore } from '../app/workspace-store'
import type { WorkspaceTarget } from './githubClient'
import {
  GitHubStore,
  type GitHubFeed,
  type GitHubSource,
  type GitHubState,
} from './githubStore'

function createStore(target: WorkspaceTarget): GitHubStore {
  return new GitHubStore(target)
}

/** The feed of the views, with the state as a store for a part that follows it. */
export interface GitHubSubscription extends GitHubFeed {
  /** Each new state of the store, from a read or an event. */
  states: Readable<GitHubState>
}

/**
 * The GitHub state of one workspace, for the bar, the row, and the Checks
 * tab. Each workspace gets its own store, so one workspace never shows the
 * state of another. While a view shows it, the store reads it again on a
 * slow timer of `source.delay`, but not while `source.visible` says that the
 * page is hidden. Pass stable `fetch`, `subscribe`, `delay`, and `visible`
 * values: a new value connects again and reloads.
 */
export function useGitHubState(
  target: WorkspaceTarget,
  source: GitHubSource,
): GitHubSubscription {
  const { fetch, subscribe, delay, visible } = source
  const connect = useCallback(
    (store: GitHubStore) => store.connect({ fetch, subscribe, delay, visible }),
    [fetch, subscribe, delay, visible],
  )
  const { store, snapshot } = useWorkspaceStore(target, {
    create: createStore,
    connect,
  })
  const states = useMemo<Readable<GitHubState>>(
    () => ({ get: store.getSnapshot, subscribe: store.subscribe }),
    [store],
  )
  return useMemo(
    () => ({ state: snapshot, retry: store.retry, states }),
    [snapshot, store, states],
  )
}
