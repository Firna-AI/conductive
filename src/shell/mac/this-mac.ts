import { useSyncExternalStore } from 'react'
import type { AppModel } from '../../app/app-model'
import { Store, useStore, type Readable } from '../../app/store'
import { createDeviceApi } from '../../chat/device/device-api'
import { MacSettingsController } from '../../chat/device/mac-settings'
import { controlOf } from '../../chat/device/settings-results'
import {
  shownSettings,
  type MacSettingsState,
} from '../../chat/device/settings-view'
import { useApp } from '../context'
import { useMacApp } from './mac-app'

/**
 * Where the page asked for the start of a grant: the switch or the line of
 * the Capabilities control, or a create of New workspace.
 */
export type StartPlace = 'control' | 'create'

/** The change of the grant of one workspace on this Mac, which Stop sends. */
const stopOf = (workspaceId: string) =>
  ({ action: 'stop-workspace', workspaceId }) as const

/**
 * The settings of this Mac that every page of one Mac app window shares
 * for the person signed in: the bar of each workspace, the line Allow all
 * commands on this Mac of the Capabilities control, and the notice of a
 * new workspace whose grant did not start. They share one controller, so
 * a start from the line or a create shows on the bar at once, and the
 * result of a start stays after the control closes or New workspace opens
 * the new workspace. A start, a Stop, and Keep share the control of the
 * grant of a workspace, so each keeps the result of the last of them.
 */
export class ThisMac {
  readonly controller: MacSettingsController
  /** Where the last start of each workspace came from, by workspace ID. */
  readonly starts = new Store<Readonly<Record<string, StartPlace>>>({})
  private opened = false

  constructor(controller: MacSettingsController) {
    this.controller = controller
  }

  /**
   * Reads the settings of this Mac: the first time with a load, then again
   * behind the settings that show, such as when a workspace opens.
   */
  open(): void {
    if (this.opened) {
      void this.controller.refresh()
      return
    }
    this.opened = true
    void this.controller.start()
  }

  /**
   * Starts a grant until Stop of the workspace on this Mac, through the
   * pairing of now. Nothing goes while a change of that grant waits.
   */
  start(workspaceId: string, place: StartPlace): Promise<void> {
    const change = {
      action: 'start-workspace-until-stop',
      workspaceId,
    } as const
    if (this.controller.get().busy.includes(controlOf(change))) {
      return Promise.resolve()
    }
    if (!this.opened) this.open()
    this.mark(workspaceId, place)
    return this.controller.changeOnCurrent(change)
  }

  /** Stops the grant of the workspace on this Mac, as Stop of the bar does. */
  stop(workspaceId: string): Promise<void> {
    this.mark(workspaceId, null)
    return this.controller.change(stopOf(workspaceId))
  }

  /**
   * Follows the switch of Mac access of the workspace, after it saved. On:
   * the start of the grant of this Mac (Mac access decision 1 C). Off: the
   * Stop of that grant, when the settings that show list one, also kept
   * settings after a read that failed, because that grant may still run.
   * The Stop shows no result, because a switch-off ends the grants of every
   * Mac (Mac access decision 6 C).
   */
  async switched(workspaceId: string, on: boolean): Promise<void> {
    if (on) return this.start(workspaceId, 'control')
    this.forget(workspaceId)
    const shown = shownSettings(this.controller.get())
    const listed =
      shown?.settings.workspaceWindows.some(
        (grant) => grant.workspaceId === workspaceId,
      ) ?? false
    if (!listed) return
    await this.controller.change(stopOf(workspaceId))
    this.forget(workspaceId)
  }

  /**
   * Mac access of the workspace is off, so the result of its last start or
   * Stop goes, and the notice of a new workspace with it.
   */
  forget(workspaceId: string): void {
    this.mark(workspaceId, null)
    this.controller.forget(stopOf(workspaceId))
  }

  /**
   * Notes where the last start of the workspace came from, or that none
   * counts. The starts stay the same value when nothing changes, so the
   * parts that read them do not draw again.
   */
  private mark(workspaceId: string, place: StartPlace | null): void {
    this.starts.change((starts) => {
      const known = Object.hasOwn(starts, workspaceId)
      if (known ? starts[workspaceId] === place : place === null) return starts
      const others = Object.fromEntries(
        Object.entries(starts).filter(([id]) => id !== workspaceId),
      )
      return place === null ? others : { ...others, [workspaceId]: place }
    })
  }
}

/** The shared settings of this Mac of each app, by the ID of the person. */
const kept = new WeakMap<AppModel, Map<string, ThisMac>>()

function thisMacOf(app: AppModel, userId: string): ThisMac {
  let people = kept.get(app)
  if (!people) {
    people = new Map()
    kept.set(app, people)
  }
  let mac = people.get(userId)
  if (!mac) {
    const api = createDeviceApi(app.services.api)
    mac = new ThisMac(new MacSettingsController(api))
    people.set(userId, mac)
  }
  return mac
}

/**
 * The shared settings of this Mac in the Mac app, for the person signed in,
 * or `null` in a browser, which has no Mac. Another person, after a
 * sign-in on the same window, gets their own. The settings read only once
 * a part calls `open` or `start`.
 */
export function useThisMac(): ThisMac | null {
  const app = useApp()
  const boot = useStore(app.boot)
  const macApp = useMacApp() !== null
  if (!macApp || boot.state !== 'ready') return null
  return thisMacOf(app, boot.user.id)
}

const noMac: Readable<null> = {
  get: () => null,
  subscribe: () => () => undefined,
}

/** The state of the shared settings of this Mac, or `null` without a Mac. */
export function useThisMacState(mac: ThisMac): MacSettingsState
export function useThisMacState(mac: ThisMac | null): MacSettingsState | null
export function useThisMacState(mac: ThisMac | null): MacSettingsState | null {
  const source: Readable<MacSettingsState | null> = mac
    ? { get: mac.controller.get, subscribe: mac.controller.subscribe }
    : noMac
  return useSyncExternalStore(source.subscribe, source.get, source.get)
}
