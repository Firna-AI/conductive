import {
  withStartStep,
  withStartFailure,
  withReportedStart,
} from './durable-start'
import type { SendMessageRequest } from '../../src/shared/messages'
import type { StartStep, WorkspaceStart } from '../../src/shared/workspaces'
import { reconciledLifecycle } from './durable-reconciliation'
import {
  DISK_KEEPALIVE_MS,
  IDLE_MS,
  TURN_HEARTBEAT_MS,
  type DurableLifecycleState,
  type LifecycleHooks,
  type LifecycleStorage,
} from './durable-types'

const STATE_KEY = 'lifecycle:state'

/** One instance lives inside each workspace Durable Object. */
export class DurableLifecycle {
  private pending: Promise<unknown> = Promise.resolve()
  private readonly storage: LifecycleStorage
  private readonly now: () => number
  private readonly hooks: LifecycleHooks

  constructor(
    storage: LifecycleStorage,
    now: () => number,
    hooks: LifecycleHooks,
  ) {
    this.storage = storage
    this.now = now
    this.hooks = hooks
  }

  read(): Promise<DurableLifecycleState | undefined> {
    return this.storage.get(STATE_KEY)
  }

  initialize(input: {
    workspaceId: string
    orgId: string
    firstMessage: SendMessageRequest
  }): Promise<void> {
    return this.serial(async () => {
      if (await this.read()) return
      await this.write({
        workspaceId: input.workspaceId,
        orgId: input.orgId,
        state: 'starting',
        start: null,
        pendingFirstMessage: input.firstMessage,
        lastActivityAt: this.now(),
        runningSessions: [],
        runnerConnected: false,
        stoppedAt: null,
        nextDiskKeepaliveAt: null,
        error: null,
      })
    })
  }

  beginStart(kind: WorkspaceStart['kind']): Promise<void> {
    return this.update((state) => ({
      ...state,
      state: 'starting',
      start: { kind, startedAt: this.now(), steps: [] },
      error: null,
      stoppedAt: null,
      nextDiskKeepaliveAt: null,
      runnerConnected: false,
      lastActivityAt: this.now(),
      startupPrepared: false,
    }))
  }

  step(id: string, label: string, status: StartStep['state']): Promise<void> {
    return this.update((state) =>
      withStartStep(state, id, label, status, this.now()),
    )
  }

  runnerReady(): Promise<void> {
    return this.update((state) =>
      state.state === 'stopped' || state.state === 'archived'
        ? state
        : {
            ...state,
            state:
              state.start && !state.startupPrepared
                ? 'starting'
                : state.runningSessions.length
                  ? 'working'
                  : ['unread', 'input'].includes(state.state)
                    ? state.state
                    : 'ready',
            runnerConnected: true,
            error: null,
            stoppedAt: null,
            nextDiskKeepaliveAt: null,
          },
    )
  }

  runnerDisconnected(): Promise<void> {
    return this.update((state) => ({ ...state, runnerConnected: false }))
  }

  reportStart(start: WorkspaceStart): Promise<void> {
    return this.update((state) => withReportedStart(state, start))
  }

  prepared(): Promise<void> {
    return this.update((state) =>
      state.state === 'stopped' || state.state === 'archived'
        ? state
        : {
            ...state,
            startupPrepared: true,
            state: state.runnerConnected
              ? state.runningSessions.length
                ? 'working'
                : 'ready'
              : 'starting',
          },
    )
  }

  activity(): Promise<void> {
    return this.update(async (state) => {
      if (state.state === 'stopped' || state.state === 'archived') return state
      return reconciledLifecycle(
        { ...state, lastActivityAt: this.now() },
        await this.hooks.extendDeadline(),
        this.now(),
      )
    })
  }

  rearmStopped(): Promise<void> {
    return this.serial(async () => {
      const state = await this.read()
      if (state?.state === 'stopped') await this.write(state)
    })
  }

  turn(sessionId: string, running: boolean): Promise<void> {
    return this.update(async (state) => {
      if (state.state === 'stopped' || state.state === 'archived') return state
      const remote = await this.hooks.extendDeadline()
      if (remote) return reconciledLifecycle(state, remote, this.now())
      const sessions = new Set(state.runningSessions)
      if (running) sessions.add(sessionId)
      else sessions.delete(sessionId)
      return {
        ...state,
        runningSessions: [...sessions],
        state: sessions.size ? 'working' : 'ready',
        lastActivityAt: this.now(),
      }
    })
  }

  stopped(): Promise<void> {
    return this.update((state) =>
      state.state === 'stopped'
        ? state
        : reconciledLifecycle(state, 'stopped', this.now()),
    )
  }

  fail(error: DurableLifecycleState['error']): Promise<void> {
    return this.update((state) => withStartFailure(state, error, this.now()))
  }

  acknowledgeFirstMessage(): Promise<void> {
    return this.update((state) => ({ ...state, pendingFirstMessage: null }))
  }

  clear(preserveAlarm = false): Promise<boolean> {
    return this.serial(async () => {
      if (!preserveAlarm) await this.storage.deleteAlarm()
      return this.storage.delete(STATE_KEY)
    })
  }

  exclusive<T>(operation: () => Promise<T>): Promise<T> {
    return this.serial(operation)
  }

  alarm(): Promise<void> {
    return this.serial(async () => {
      let state = await this.read()
      if (!state || state.state === 'archived') return
      let stopPending = false
      if (
        !state.runnerConnected &&
        state.state !== 'stopped' &&
        this.hooks.reconcile
      ) {
        state = reconciledLifecycle(
          state,
          await this.hooks.reconcile(),
          this.now(),
        )
      }
      if (state.state === 'stopped') {
        if (
          state.nextDiskKeepaliveAt !== null &&
          state.nextDiskKeepaliveAt <= this.now()
        ) {
          if ((await this.hooks.keepalive()) === false) {
            await this.storage.setAlarm(this.now() + 5_000)
            return
          }
          state = {
            ...state,
            stoppedAt: this.now(),
            nextDiskKeepaliveAt: this.now() + DISK_KEEPALIVE_MS,
          }
        }
      } else if (state.runningSessions.length) {
        state = reconciledLifecycle(
          state,
          await this.hooks.extendDeadline(),
          this.now(),
        )
      } else if (
        state.state !== 'error' &&
        state.lastActivityAt + IDLE_MS <= this.now()
      ) {
        const result = await this.hooks.stop()
        stopPending = result === 'pending'
        state = reconciledLifecycle(
          state,
          result === 'pending' ? undefined : (result ?? 'stopped'),
          this.now(),
        )
      }
      await this.write(state)
      if (stopPending) await this.storage.setAlarm(this.now() + 30_000)
    })
  }

  private update(
    change: (
      state: DurableLifecycleState,
    ) => DurableLifecycleState | Promise<DurableLifecycleState>,
  ): Promise<void> {
    return this.serial(async () => {
      const state = await this.read()
      if (state) await this.write(await change(state))
    })
  }

  private async write(state: DurableLifecycleState): Promise<void> {
    await this.storage.put(STATE_KEY, state)
    const alarm =
      state.state === 'stopped'
        ? state.nextDiskKeepaliveAt
        : state.state === 'error'
          ? this.now() + 5_000
          : state.runningSessions.length
            ? this.now() + TURN_HEARTBEAT_MS
            : state.lastActivityAt + IDLE_MS
    if (alarm === null || state.state === 'archived')
      await this.storage.deleteAlarm()
    else {
      const startPending = (await this.hooks.startPending?.()) ?? false
      await this.storage.setAlarm(
        startPending
          ? Math.min(alarm, this.now() + 1_000)
          : !state.runnerConnected &&
              state.state !== 'stopped' &&
              this.hooks.reconcile
            ? Math.min(alarm, this.now() + 5_000)
            : alarm,
      )
    }
    await this.hooks.changed(state)
  }

  private serial<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.pending.then(operation)
    this.pending = next.catch(() => undefined)
    return next
  }
}
