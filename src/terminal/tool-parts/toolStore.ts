import type { WorkspaceEvent } from '../../shared/events'
import {
  subscribeToWorkspace,
  type SubscribeWorkspaceEvents,
} from './workspace'

/**
 * The reducer of a tool. It takes the tool's own actions and the events of
 * its workspace, so each event reaches the state as it is.
 */
export type ToolReducer<S, A> = (state: S, action: A | WorkspaceEvent) => S

interface Connection {
  subscribe: SubscribeWorkspaceEvents
  stop: () => void
}

/**
 * The state of one tool of one workspace, outside React. React reads it with
 * `useSyncExternalStore`, through `listen` and `getSnapshot`. While React
 * listens, the store takes the events of its workspace and gives each one to
 * the reducer, in the order of the subscription. The tool's own actions go
 * through `dispatch`, to the same reducer.
 */
export class ToolStore<S, A> {
  /** The workspace whose events the store takes. */
  readonly workspaceId: string
  private state: S
  private readonly reducer: ToolReducer<S, A>
  private readonly listeners = new Set<() => void>()
  private connection: Connection | null = null

  constructor(
    reducer: ToolReducer<S, A>,
    initialState: S,
    workspaceId: string,
  ) {
    this.reducer = reducer
    this.state = initialState
    this.workspaceId = workspaceId
  }

  /** The state. It stays the same object until an action or event changes it. */
  readonly getSnapshot = (): S => this.state

  /** Gives one of the tool's own actions to the reducer. */
  readonly dispatch = (action: A): void => {
    this.apply(action)
  }

  /**
   * React's subscription: `listener` hears each change of the state. The first
   * listener subscribes to the events of the workspace through `subscribe`,
   * and the last one to leave stops that subscription. A new `subscribe`
   * subscribes again, and the state stays.
   */
  listen(
    listener: () => void,
    subscribe: SubscribeWorkspaceEvents,
  ): () => void {
    this.listeners.add(listener)
    this.connect(subscribe)
    return () => {
      this.listeners.delete(listener)
      if (this.listeners.size === 0) this.disconnect()
    }
  }

  private connect(subscribe: SubscribeWorkspaceEvents): void {
    if (this.connection?.subscribe === subscribe) return
    this.disconnect()
    const connection: Connection = { subscribe, stop: () => undefined }
    this.connection = connection
    // A subscription can deliver its history at once, inside this call. The
    // listener is already in place, so each change of that history reaches it.
    connection.stop = subscribeToWorkspace(
      { workspaceId: this.workspaceId, subscribe },
      (event) => {
        if (this.connection === connection) this.apply(event)
      },
    )
    // The last listener can leave while the history arrives.
    if (this.connection !== connection) connection.stop()
  }

  private disconnect(): void {
    const connection = this.connection
    this.connection = null
    connection?.stop()
  }

  private apply(action: A | WorkspaceEvent): void {
    const next = this.reducer(this.state, action)
    if (next === this.state) return
    this.state = next
    for (const listener of [...this.listeners]) listener()
  }
}
