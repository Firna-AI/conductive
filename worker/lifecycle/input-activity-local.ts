import { reconciledLifecycle } from './durable-reconciliation'
import {
  LIFECYCLE_STATE_KEY,
  type DurableLifecycleState,
  type LifecycleReconciliation,
  type LifecycleStorage,
} from './durable-types'
import type { LifecycleActivitySnapshot } from './input-activity-state'

export class LifecycleInputState {
  private revision = 0
  private readonly options: {
    storage: LifecycleStorage
    now(): number
    serial<T>(operation: () => Promise<T>): Promise<T>
    write(state: DurableLifecycleState): Promise<void>
  }

  constructor(options: {
    storage: LifecycleStorage
    now(): number
    serial<T>(operation: () => Promise<T>): Promise<T>
    write(state: DurableLifecycleState): Promise<void>
  }) {
    this.options = options
  }

  invalidate(): void {
    this.revision++
  }

  async activity(
    extend: () => Promise<LifecycleReconciliation | void>,
  ): Promise<void> {
    const captured = await this.options.serial(async () => {
      const state = await this.options.storage.get(LIFECYCLE_STATE_KEY)
      if (!state || !this.acceptsInput(state)) return
      await this.options.write({
        ...state,
        lastActivityAt: Math.max(state.lastActivityAt, this.options.now()),
      })
      return { workspaceId: state.workspaceId, revision: this.revision }
    })
    if (captured) await this.reconcile(captured, (await extend()) ?? undefined)
  }

  record(at: number): Promise<void> {
    return this.options.serial(async () => {
      const state = await this.options.storage.get(LIFECYCLE_STATE_KEY)
      if (!state || !this.acceptsInput(state) || at <= state.lastActivityAt)
        return
      await this.options.storage.put(LIFECYCLE_STATE_KEY, {
        ...state,
        lastActivityAt: at,
      })
    })
  }

  capture(): Promise<LifecycleActivitySnapshot | undefined> {
    return this.options.serial(async () => {
      const state = await this.options.storage.get(LIFECYCLE_STATE_KEY)
      return state && this.acceptsInput(state)
        ? { workspaceId: state.workspaceId, revision: this.revision }
        : undefined
    })
  }

  reconcile(
    snapshot: LifecycleActivitySnapshot,
    remote: LifecycleReconciliation,
  ): Promise<boolean> {
    return this.options.serial(async () => {
      const state = await this.options.storage.get(LIFECYCLE_STATE_KEY)
      if (
        !state ||
        !remote ||
        snapshot.workspaceId !== state.workspaceId ||
        snapshot.revision !== this.revision ||
        !this.acceptsInput(state)
      )
        return false
      await this.options.write(
        reconciledLifecycle(state, remote, this.options.now()),
      )
      return true
    })
  }

  private acceptsInput(state: DurableLifecycleState): boolean {
    return (
      !['stopped', 'archived', 'error'].includes(state.state) &&
      state.startStop === undefined
    )
  }
}
