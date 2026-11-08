import { useEffect, useMemo, useSyncExternalStore } from 'react'

/** The workspace that a connected view shows. Each workspace gets its own store. */
export interface WorkspaceIdentity {
  orgId: string
  workspaceId: string
}

/**
 * A store of one workspace, as a connected view reads it: an object outside
 * React that combines API replies with the live events of the workspace.
 * Both functions are bound, as arrow properties are, because React calls
 * them without their object.
 */
export interface WorkspaceStore<S> {
  /** Calls `listener` after each change of the snapshot. The result stops it. */
  subscribe: (listener: () => void) => () => void
  /** The snapshot now. It stays the same object until it changes. */
  getSnapshot: () => S
}

/**
 * How a connected view makes and runs its store. Keep both functions stable,
 * as module functions or through `useCallback`.
 */
export interface WorkspaceStoreLifecycle<T> {
  /**
   * Makes the store of one workspace. It starts no read and no subscription,
   * because React can call it for a render that it throws away. A new
   * function makes a new store.
   */
  create: (workspace: WorkspaceIdentity) => T
  /**
   * Starts the store: its first read and its events. The result stops them.
   * A new function stops the store and connects the same store again.
   */
  connect: (store: T) => () => void
}

/**
 * The store of the workspace that a connected view shows, and its snapshot.
 * The hook makes the store, connects it after the render, and gives the view
 * each change. Another workspace gets a new store: the hook stops the old
 * store, connects the new one, and the view reads only the new one from its
 * first render. The hook stops the store at unmount.
 */
export function useWorkspaceStore<T, S>(
  workspace: WorkspaceIdentity,
  lifecycle: WorkspaceStoreLifecycle<T & WorkspaceStore<S>>,
): { store: T; snapshot: S } {
  const { orgId, workspaceId } = workspace
  const { create, connect } = lifecycle
  const store = useMemo(
    () => create({ orgId, workspaceId }),
    [create, orgId, workspaceId],
  )
  useEffect(() => connect(store), [connect, store])
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  )
  return { store, snapshot }
}
