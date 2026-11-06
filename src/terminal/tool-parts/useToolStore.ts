import { useCallback, useState, useSyncExternalStore } from 'react'
import { ToolStore, type ToolReducer } from './toolStore'
import type { ToolWorkspace } from './workspace'

/**
 * The state and the dispatch of a tool, as `useReducer` gives them, with the
 * events of its workspace. The store lives as long as the component, and it
 * starts nothing during a render. React subscribes to it after the render,
 * which subscribes to the workspace's events, and it stops at unmount. A new
 * `workspace.subscribe` subscribes again, and the state stays.
 */
export function useToolStore<S, A>(
  reducer: ToolReducer<S, A>,
  initialState: S,
  workspace: ToolWorkspace,
): [S, (action: A) => void] {
  const [store] = useState(
    () => new ToolStore(reducer, initialState, workspace.workspaceId),
  )
  const { subscribe } = workspace
  const listen = useCallback(
    (listener: () => void) => store.listen(listener, subscribe),
    [store, subscribe],
  )
  return [useSyncExternalStore(listen, store.getSnapshot), store.dispatch]
}
