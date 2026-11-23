import type { DevicePairing } from '../../shared/generated/DevicePairing'
import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { ApiError, type ApiClient } from '../../app/api/client'
import type { DeviceSettingsResponse } from '../../shared/device'
import { messageOf } from '../state/context'
import { systemClock, type Clock } from '../ui/clock'
import {
  createDeviceApi,
  type DeviceApi,
  type SettingsChange,
} from './device-api'
import { SettingsControls, type Hold, type Taken } from './settings-controls'
import {
  countedOutcome,
  notAvailableCause,
  staleCause,
  subjectOf,
  type ChangeResult,
} from './settings-results'
import {
  readyView,
  shownSettings,
  type MacSettingsState,
  type MacSettingsView,
} from './settings-view'

const unavailable = (error: unknown) =>
  error instanceof ApiError && error.code === 'device_unavailable'

/**
 * Reads and changes the settings of this Mac. The Mac keeps and applies
 * them, and the Worker only passes each read and change to it. One read or
 * change runs at a time, in the order of the user's actions, so the Mac
 * gets them in that order. Each reply holds the whole settings after its
 * operation, so the reply of the last operation shows the newest settings.
 * Each control keeps the result of its last change until its next change,
 * through every read and a new pairing. A change that fails reads the
 * settings again, because the Mac may still have made it. A read again
 * that fails, for another cause than a Mac that is not available, keeps
 * the settings that show as kept settings, which are not current, so each
 * part can tell them from the settings of a read that worked. A change
 * never goes to a pairing other than the one that the user acted in: it
 * fails instead, and the user acts again. A change that the page took back
 * never goes, and keeps no result.
 */
export class MacSettingsController {
  private readonly api: DeviceApi
  private readonly clock: Clock
  private readonly listeners = new Set<() => void>()
  private readonly controls = new SettingsControls()
  private view: MacSettingsView = { kind: 'loading' }
  private state: MacSettingsState = {
    ...this.view,
    busy: [],
    waiting: {},
    results: {},
  }
  private queue: Promise<void> = Promise.resolve()
  private alive = false

  constructor(api: DeviceApi, clock: Clock = systemClock) {
    this.api = api
    this.clock = clock
  }

  readonly get = (): MacSettingsState => this.state

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private publish(): void {
    const { waiting, results } = this.controls
    this.state = {
      ...this.view,
      busy: Object.keys(waiting),
      waiting,
      results,
    }
    for (const listener of this.listeners) listener()
  }

  private show(view: MacSettingsView): void {
    this.view = view
    this.publish()
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
   * that show stay until the reply. After a read that fails for another
   * cause than a Mac that is not available, they stay as kept settings.
   */
  readonly refresh = (): Promise<void> => this.enqueue(() => this.read(true))

  private async read(quiet: boolean): Promise<void> {
    if (!this.alive) return
    const shown = quiet ? shownSettings(this.view) : null
    if (shown === null) this.show({ kind: 'loading' })
    try {
      const pairing = await this.api.current()
      if (!this.alive) return
      if (!pairing) return this.show({ kind: 'unavailable' })
      const read = await this.api.settings()
      if (!this.alive) return
      this.show(readyView(read))
    } catch (error) {
      if (!this.alive) return
      if (unavailable(error)) return this.show({ kind: 'unavailable' })
      if (shown === null) {
        return this.show({ kind: 'failed', message: messageOf(error) })
      }
      const { pairing, settings } = shown
      this.show({ kind: 'kept', pairing, settings })
    }
  }

  /**
   * Asks the Mac to make one change, through the pairing of the settings
   * that show, also of kept settings, so that Stop and Remove still go
   * after a read that failed. Its control is busy until the Mac answers,
   * and its result replaces the result of its last change.
   */
  readonly change = (change: SettingsChange): Promise<void> => {
    const shown = shownSettings(this.view)
    if (shown === null || this.controls.busy(change)) return Promise.resolve()
    const { hold, last } = this.take(change)
    const subject = subjectOf(change, shown.settings, last)
    return this.enqueue(() => this.send(hold, shown.pairing, subject))
  }

  /**
   * Makes a change through the pairing of now: it reads the pairing and the
   * settings of this Mac first, then sends the change, so the change reaches
   * the Mac app of this window as it is connected now. The start of a grant
   * uses it, because the start can wait behind other changes, such as at
   * the switch of Mac access, or come after a create. The change goes only
   * after a read that worked. When the read finds no Mac or fails, the
   * change fails as not reached, and nothing goes to a Mac, also while kept
   * settings show. A change that the page takes back before its turn reads
   * nothing, and one that the page takes back during its read never goes.
   */
  readonly changeOnCurrent = (change: SettingsChange): Promise<void> => {
    if (this.controls.busy(change)) return Promise.resolve()
    const { hold, last } = this.take(change)
    return this.enqueue(async () => {
      if (!this.controls.has(hold)) return
      await this.read(true)
      if (!this.alive || !this.controls.has(hold)) return
      const view = this.view
      const settings = view.kind === 'ready' ? view.settings : null
      const subject = subjectOf(change, settings, last)
      if (view.kind === 'ready') return this.send(hold, view.pairing, subject)
      this.finish(hold, {
        change,
        subject,
        outcome: { status: 'failed', message: notAvailableCause },
        unreached: true,
      })
    })
  }

  /**
   * Takes back `change` while it waits, such as a start or a Keep of a grant
   * at a switch-off of Mac access. When the change that holds the control of
   * `change` has its action, that change never goes to the Mac, also after
   * the read that it waits for, and its control is free at once. It keeps no
   * result, also when it already went to the Mac. Another change of that
   * control, such as a Stop, still goes.
   */
  readonly cancel = (change: SettingsChange): void => {
    if (this.controls.cancel(change)) this.publish()
  }

  /**
   * Makes the control of a change busy, and takes away the result of its
   * last change, which it returns with the hold of the change.
   */
  private take(change: SettingsChange): Taken {
    const taken = this.controls.take(change)
    this.publish()
    return taken
  }

  /**
   * Ends a change with its result, which gets the time of now, and shows
   * the settings, also those of the reply of a change that the page took
   * back, which keeps no result.
   */
  private finish(hold: Hold, result: Omit<ChangeResult, 'at'>): void {
    this.controls.finish(hold, { ...result, at: this.clock.now() })
    this.publish()
  }

  private async send(
    hold: Hold,
    pairing: DevicePairing,
    subject: string,
  ): Promise<void> {
    if (!this.alive || !this.controls.has(hold)) return
    const { change } = hold
    const shown = shownSettings(this.view)?.pairing ?? null
    const stale = staleCause(shown, pairing)
    if (stale !== null) {
      return this.finish(hold, {
        change,
        subject,
        outcome: { status: 'failed', message: stale },
        unreached: shown === null,
      })
    }
    let reply: DeviceSettingsResponse
    try {
      reply = await this.api.changeSettings(pairing, change)
    } catch (error) {
      if (!this.alive) return
      this.finish(hold, {
        change,
        subject,
        outcome: { status: 'failed', message: messageOf(error) },
        unreached: unavailable(error),
      })
      void this.refresh()
      return
    }
    if (!this.alive) return
    this.view = readyView(reply)
    const outcome = countedOutcome(change, reply.settings, reply.outcome)
    this.finish(hold, { change, subject, outcome })
  }
}

/**
 * The settings controller of this window, and its state. A new `client`
 * or `clock` makes a new controller, so pass stable ones, such as the
 * app's.
 */
export function useMacSettings(
  client: ApiClient,
  clock: Clock = systemClock,
): {
  controller: MacSettingsController
  state: MacSettingsState
} {
  const controller = useMemo(
    () => new MacSettingsController(createDeviceApi(client), clock),
    [client, clock],
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
