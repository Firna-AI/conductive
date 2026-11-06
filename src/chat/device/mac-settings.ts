import { useEffect, useMemo, useSyncExternalStore } from 'react'
import type { DevicePairing, DeviceSettings } from '../../shared/device'
import { ChatApiError, type FetchLike } from '../api/client'
import { messageOf } from '../state/context'
import {
  createDeviceApi,
  type DeviceApi,
  type PairedSettings,
  type SettingsChange,
} from './device-api'
import { equalPairing } from './device-snapshot'

/** The settings of this Mac, as the section shows them. */
export type MacSettingsState =
  | { kind: 'loading' }
  /** This window has no live connection to its Mac. */
  | { kind: 'unavailable' }
  | { kind: 'failed'; message: string }
  | {
      kind: 'ready'
      pairing: DevicePairing
      settings: DeviceSettings
      /** The keys of the changes that wait for the Mac. */
      busy: readonly string[]
      /** The cause of the last change that failed. */
      notice: string | null
    }

type ReadySettings = Extract<MacSettingsState, { kind: 'ready' }>

const unavailable = (error: unknown) =>
  error instanceof ChatApiError && error.code === 'device_unavailable'

/**
 * Reads and changes the settings of this Mac. The Mac keeps and applies
 * them, and the Worker only passes each read and change to it. One read or
 * change runs at a time, in the order of the user's actions, so the Mac
 * gets them in that order. Each reply holds the whole settings after its
 * operation, so the reply of the last operation shows the newest settings.
 * A change that fails reads the settings again, because the Mac may still
 * have made it. A change for an older pairing does not go, because its
 * connection no longer acts.
 */
export class MacSettingsController {
  private readonly api: DeviceApi
  private readonly listeners = new Set<() => void>()
  private state: MacSettingsState = { kind: 'loading' }
  private queue: Promise<void> = Promise.resolve()
  private alive = false

  constructor(api: DeviceApi) {
    this.api = api
  }

  readonly get = (): MacSettingsState => this.state

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private set(state: MacSettingsState): void {
    this.state = state
    for (const listener of this.listeners) listener()
  }

  /** Runs an operation after every operation before it has ended. */
  private enqueue(run: () => Promise<void>): Promise<void> {
    const next = this.queue.then(run)
    this.queue = next.catch(() => undefined)
    return next
  }

  readonly start = (): Promise<void> => {
    this.alive = true
    return this.load()
  }

  readonly stop = (): void => {
    this.alive = false
  }

  /** Reads the pairing of this window, then the settings of its Mac. */
  readonly load = (): Promise<void> => this.enqueue(() => this.read(false))

  /**
   * Reads again, such as after an answer that saved a choice. The settings
   * that show stay until the reply, and stay after a failed read.
   */
  readonly refresh = (): Promise<void> => this.enqueue(() => this.read(true))

  private async read(quiet: boolean): Promise<void> {
    if (!this.alive) return
    const keep = quiet && this.state.kind === 'ready'
    if (!keep) this.set({ kind: 'loading' })
    try {
      const pairing = await this.api.current()
      if (!this.alive) return
      if (!pairing) return this.set({ kind: 'unavailable' })
      const read = await this.api.settings()
      if (!this.alive) return
      const shown = this.state
      const same =
        shown.kind === 'ready' && equalPairing(shown.pairing, read.pairing)
      this.set({
        kind: 'ready',
        ...read,
        busy: same ? shown.busy : [],
        notice: same ? shown.notice : null,
      })
    } catch (error) {
      if (!this.alive) return
      if (unavailable(error)) this.set({ kind: 'unavailable' })
      else if (!keep) this.set({ kind: 'failed', message: messageOf(error) })
    }
  }

  /** Asks the Mac to make one change. `key` marks its control as busy. */
  readonly change = (key: string, operation: SettingsChange): Promise<void> => {
    const state = this.state
    if (state.kind !== 'ready' || state.busy.includes(key)) {
      return Promise.resolve()
    }
    const { pairing } = state
    this.set({ ...state, busy: [...state.busy, key], notice: null })
    return this.enqueue(() => this.send(key, pairing, operation))
  }

  private async send(
    key: string,
    pairing: DevicePairing,
    operation: SettingsChange,
  ): Promise<void> {
    const before = this.state
    if (!this.alive || before.kind !== 'ready') return
    const done = (now: ReadySettings) => now.busy.filter((item) => item !== key)
    if (!equalPairing(before.pairing, pairing)) {
      return this.set({ ...before, busy: done(before) })
    }
    let reply: PairedSettings | null = null
    let failure: unknown = null
    try {
      reply = await this.api.changeSettings(pairing, operation)
    } catch (error) {
      failure = error
    }
    const now = this.state
    if (!this.alive || now.kind !== 'ready') return
    if (reply === null) {
      this.set({ ...now, busy: done(now), notice: messageOf(failure) })
      void this.refresh()
      return
    }
    this.set({ ...now, ...reply, busy: done(now) })
  }
}

/**
 * The settings controller of this window, and its state. A new `fetch`
 * makes a new controller, so pass a stable function.
 */
export function useMacSettings(fetch: FetchLike): {
  controller: MacSettingsController
  state: MacSettingsState
} {
  const controller = useMemo(
    () => new MacSettingsController(createDeviceApi(fetch)),
    [fetch],
  )
  useEffect(() => {
    void controller.start()
    return controller.stop
  }, [controller])
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.get,
    controller.get,
  )
  return { controller, state }
}
