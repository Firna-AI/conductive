import {
  withStartStep,
  withStartFailure,
  withReportedStart,
} from './durable-start'
import type { SendMessageRequest } from '../../src/shared/messages'
import type { StartStep, WorkspaceStart } from '../../src/shared/workspaces'
import { reconciledLifecycle } from './durable-reconciliation'
import { advanceDiskRetentionState } from './disk-retention-state'
import { writeLifecycleState } from './durable-scheduling'
import { failedStartStop } from './durable-start-stop'
import { advanceLifecycleAlarm } from './durable-alarm'
import { applyLifecycleTurn, recoverLifecycleTurns } from './durable-turns'
import { isConfirmedStopped } from './confirmed-stop'
import { LifecycleInputState } from './input-activity-local'
import {
  LIFECYCLE_STATE_KEY,
  type DurableLifecycleState,
  type LifecycleHooks,
  type LifecycleStorage,
  type LifecyclePublisher,
} from './durable-types'

/** One instance lives inside each workspace Durable Object. */
export class DurableLifecycle {
  private pending: Promise<unknown> = Promise.resolve()
  readonly input: LifecycleInputState
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
    this.input = new LifecycleInputState({
      storage,
      now,
      serial: (operation) => this.serial(operation),
      write: (state) => this.write(state),
    })
  }

  read(): Promise<DurableLifecycleState | undefined> {
    return this.storage.get(LIFECYCLE_STATE_KEY)
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
      diskRetentionDeadlineAt: undefined,
      runnerConnected: false,
      lastActivityAt: this.now(),
      startupPrepared: false,
      startStop: undefined,
      diskRetentionCommand: undefined,
    }))
  }

  step(
    id: string,
    label: string,
    status: StartStep['state'],
    publish?: LifecyclePublisher,
  ): Promise<void> {
    return this.update(
      (state) => withStartStep(state, id, label, status, this.now()),
      publish,
    )
  }

  runnerReady(publish?: LifecyclePublisher): Promise<void> {
    return this.update(
      (state) =>
        state.state === 'stopped' ||
        state.state === 'archived' ||
        state.state === 'error' ||
        state.startStop !== undefined
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
      publish,
    )
  }

  runnerDisconnected(publish?: LifecyclePublisher): Promise<void> {
    return this.serial(async () => {
      const state = await this.read()
      if (state?.runnerConnected)
        await this.write({ ...state, runnerConnected: false }, publish)
    })
  }

  reportStart(
    start: WorkspaceStart,
    publish?: LifecyclePublisher,
  ): Promise<void> {
    return this.update((state) => withReportedStart(state, start), publish)
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
    return this.input.activity(() => this.hooks.extendDeadline())
  }

  rearmStopped(): Promise<void> {
    return this.serial(async () => {
      const state = await this.read()
      if (state && isConfirmedStopped(state)) await this.write(state)
    })
  }

  recoverTurns(publish?: LifecyclePublisher): Promise<void> {
    return this.update(
      (state) => recoverLifecycleTurns(state, this.hooks),
      publish,
    )
  }

  turn(
    sessionId: string,
    running: boolean,
    publish?: LifecyclePublisher,
    occurredAt = this.now(),
  ): Promise<void> {
    const change = { sessionId, running, occurredAt }
    return this.update(
      (state) => applyLifecycleTurn(state, change, this.hooks, this.now),
      publish,
    )
  }

  stopped(): Promise<void> {
    return this.update((state) =>
      reconciledLifecycle(state, 'stopped', this.now()),
    )
  }

  fail(error: DurableLifecycleState['error']): Promise<void> {
    return this.update((state) => withStartFailure(state, error, this.now()))
  }

  stopFailedStart(
    error: NonNullable<DurableLifecycleState['error']>,
    cancelled: boolean,
  ): Promise<void> {
    return this.update((state) =>
      failedStartStop(state, error, cancelled, this.now()),
    )
  }

  acknowledgeFirstMessage(publish?: LifecyclePublisher): Promise<void> {
    return this.update(
      (state) => ({ ...state, pendingFirstMessage: null }),
      publish,
    )
  }

  clear(preserveAlarm = false): Promise<boolean> {
    return this.serial(async () => {
      this.input.invalidate()
      if (!preserveAlarm) await this.storage.deleteAlarm()
      return this.storage.delete(LIFECYCLE_STATE_KEY)
    })
  }

  finishDiskMaintenance(active: () => Promise<boolean>): Promise<boolean> {
    return this.serial(async () => {
      if (!(await active())) return true
      const state = await this.read()
      return !state || (await this.keepalive(state)).done
    })
  }

  exclusive<T>(operation: () => Promise<T>): Promise<T> {
    return this.serial(operation)
  }

  alarm(): Promise<void> {
    return this.serial(async () => {
      const state = await this.read()
      if (state)
        await advanceLifecycleAlarm(
          this.storage,
          this.hooks,
          state,
          this.now,
          (next) => this.write(next),
          (next) => this.keepalive(next),
        )
    })
  }

  private update(
    change: (
      state: DurableLifecycleState,
    ) => DurableLifecycleState | Promise<DurableLifecycleState>,
    publish?: LifecyclePublisher,
  ): Promise<void> {
    return this.serial(async () => {
      const state = await this.read()
      if (state) await this.write(await change(state), publish)
    })
  }

  private async write(
    state: DurableLifecycleState,
    publish?: LifecyclePublisher,
  ): Promise<void> {
    this.input.invalidate()
    await writeLifecycleState(
      this.storage,
      this.hooks,
      state,
      this.now,
      publish,
    )
  }

  private keepalive(state: DurableLifecycleState) {
    return advanceDiskRetentionState(
      this.storage,
      this.hooks,
      state,
      this.now,
      (next) => this.write(next),
    )
  }

  private serial<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.pending.then(operation)
    this.pending = next.catch(() => undefined)
    return next
  }
}
