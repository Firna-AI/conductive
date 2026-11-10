import type {
  WorkspaceIdentity,
  WorkspaceStore,
} from '../../app/workspace-store'
import type {
  WorkspaceEvent,
  WorkspaceEventEnvelope,
} from '../../shared/events'
import type { ApiFetch } from './request'
import {
  subscribeToWorkspace,
  type ToolRequests,
  type ToolWorkspace,
} from './workspace'

/**
 * The reducer of a tool. It takes the tool's own actions and the events of
 * its workspace, so each event reaches the state as it is.
 */
type ToolReducer<S, A> = (state: S, action: A | WorkspaceEvent) => S

/**
 * What a tool store takes from the workspace screen while it runs: the app's
 * fetch and the events of the workspace.
 */
export type ToolSource = Pick<ToolWorkspace, 'fetch' | 'subscribe'>

/**
 * The read of a tool's data. The state gives the number of the read that it
 * needs, so an action or an event that changes the number starts a new read.
 */
interface ToolRead<S, A> {
  /** The number of the read that the state needs. */
  key: (state: S) => number
  /**
   * Reads the data, and gives the action of the answer. A failed read gives
   * an action too, so the promise does not reject.
   */
  run: (read: {
    requests: ToolRequests
    key: number
    signal: AbortSignal
  }) => Promise<A>
}

/** One tool: its reducer, its first state, and the read of its data. */
export interface ToolDefinition<S, A> {
  reducer: ToolReducer<S, A>
  initialState: S
  /** A tool without a read takes only its own actions and the events. */
  read?: ToolRead<S, A>
  /**
   * The action of one event of the workspace, for a tool that needs more of
   * the envelope than its event, such as the time of the event. Without it,
   * the reducer takes each event as it is.
   */
  fromEnvelope?: (envelope: WorkspaceEventEnvelope) => A | WorkspaceEvent
}

/** One connection of the store. Each `connect` makes a new one. */
interface Connection {
  source: ToolSource
}

/** A read that runs or answered, with the number and the fetch that it used. */
interface Read {
  key: number
  fetch: ApiFetch
  controller: AbortController
  answered: boolean
}

/**
 * The state of one tool of one workspace, outside React. A view makes it and
 * connects it through `useWorkspaceStore`. While it is connected, the store
 * gives each event of its workspace to the reducer, in the order of the
 * subscription, and keeps the read that the state needs. The tool's own
 * actions go through `dispatch`, to the same reducer.
 */
export class ToolStore<S, A> implements WorkspaceStore<S> {
  private readonly tool: ToolDefinition<S, A>
  private readonly workspace: WorkspaceIdentity
  private state: S
  private readonly listeners = new Set<() => void>()
  /** The connection that runs, or null while the store is stopped. */
  private connection: Connection | null = null
  /** The newest read. An answered read stays after a stop. */
  private lastRead: Read | null = null
  /** A check of the read waits for the next microtask. */
  private readQueued = false

  /** Makes the store. It starts no read and no subscription. */
  constructor(tool: ToolDefinition<S, A>, workspace: WorkspaceIdentity) {
    this.tool = tool
    this.workspace = workspace
    this.state = tool.initialState
  }

  /** The state. It stays the same object until an action or event changes it. */
  readonly getSnapshot = (): S => this.state

  /** Calls `listener` after each change of the state. The result stops it. */
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Gives one of the tool's own actions to the reducer. */
  readonly dispatch = (action: A): void => {
    this.apply(action)
  }

  /**
   * Starts the store until the result stops it. The store takes the events of
   * its workspace through `source.subscribe`, also a history that arrives
   * inside the subscribe call. Then it reads the data that the state needs.
   * The stop ends the subscription and a read that has no answer.
   *
   * A later connection keeps the state, such as the revoked previews, and
   * takes events only from its own subscription. It reads again with a new
   * `fetch`, or when a stop ended a read before its answer.
   */
  connect(source: ToolSource): () => void {
    const connection: Connection = { source }
    this.connection = connection
    const { fromEnvelope } = this.tool
    const stopEvents = subscribeToWorkspace(
      { workspaceId: this.workspace.workspaceId, subscribe: source.subscribe },
      (envelope) => {
        if (this.connection !== connection) return
        this.apply(fromEnvelope ? fromEnvelope(envelope) : envelope.event)
      },
    )
    this.queueRead()
    return () => {
      stopEvents()
      if (this.connection !== connection) return
      this.connection = null
      this.stopRead()
    }
  }

  private apply(action: A | WorkspaceEvent): void {
    const next = this.tool.reducer(this.state, action)
    if (next === this.state) return
    this.state = next
    this.queueRead()
    for (const listener of [...this.listeners]) listener()
  }

  /**
   * Checks the read one microtask later, so that a burst of changes, such as
   * the history of a subscription, starts one read for the state it leaves.
   */
  private queueRead(): void {
    if (!this.tool.read || !this.connection || this.readQueued) return
    this.readQueued = true
    queueMicrotask(() => {
      this.readQueued = false
      this.startRead()
    })
  }

  /**
   * Starts the read that the state needs, unless that read already runs or
   * answered with the same fetch. A new read aborts the one before it.
   */
  private startRead(): void {
    const read = this.tool.read
    const connection = this.connection
    if (!read || !connection) return
    const key = read.key(this.state)
    const { fetch } = connection.source
    const current = this.lastRead
    if (current?.key === key && current.fetch === fetch) return
    current?.controller.abort()
    const next: Read = {
      key,
      fetch,
      controller: new AbortController(),
      answered: false,
    }
    this.lastRead = next
    const { orgId, workspaceId } = this.workspace
    const requests = { orgId, workspaceId, fetch }
    const { signal } = next.controller
    void read.run({ requests, key, signal }).then((action) => {
      // An answer counts only while the state still needs its read.
      if (signal.aborted || read.key(this.state) !== key) return
      next.answered = true
      this.apply(action)
    })
  }

  /**
   * Aborts a read that has no answer. An answered read stays, so that a new
   * connection with the same fetch reads nothing.
   */
  private stopRead(): void {
    const current = this.lastRead
    if (!current || current.answered) return
    current.controller.abort()
    this.lastRead = null
  }
}
