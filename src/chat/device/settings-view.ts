import type { DevicePairing } from '../../shared/generated/DevicePairing'
import type {
  DeviceSettings,
  DeviceSettingsResponse,
} from '../../shared/device'
import type { SettingsChange } from './device-api'
import type { ChangeResult } from './settings-results'

/** The pairing of this window, and the settings of its Mac. */
export interface ShownSettings {
  pairing: DevicePairing
  settings: DeviceSettings
}

/** The settings of this Mac, as the last read or change gave them. */
export type MacSettingsView =
  | { kind: 'loading' }
  /** This window has no live connection to its Mac. */
  | { kind: 'unavailable' }
  | { kind: 'failed'; message: string }
  /** The settings of the last read or change, which are current. */
  | { kind: 'ready'; pairing: DevicePairing; settings: DeviceSettings }
  /**
   * The settings of the last read or change that worked, which stay after
   * a later read failed for another cause than a Mac that is not available,
   * such as HTTP 502. They are not current: a grant that they list may
   * have ended.
   */
  | { kind: 'kept'; pairing: DevicePairing; settings: DeviceSettings }

/**
 * The settings of this Mac, as the section shows them, with the changes
 * that wait and the result of the last change of each control. The results
 * stay through every read, a Mac that goes away, and a new pairing.
 */
export type MacSettingsState = MacSettingsView & {
  /** The controls whose change waits for the Mac: the keys of `waiting`. */
  busy: readonly string[]
  /** The action of the change that waits, by control. */
  waiting: Readonly<Record<string, SettingsChange['action']>>
  /** The result of the last change of each control, by control. */
  results: Readonly<Record<string, ChangeResult>>
}

/** The settings and the pairing of a reply, which are current. */
export function readyView(reply: DeviceSettingsResponse): MacSettingsView {
  const pairing = { deviceId: reply.deviceId, connectionId: reply.connectionId }
  return { kind: 'ready', pairing, settings: reply.settings }
}

/**
 * The pairing and the settings that show, current or kept, or null while
 * none show. A part that keeps Stop for a grant that may still run, such
 * as the bar, reads them. A part that says that a grant runs, such as the
 * switch of Mac access of the Capabilities control, reads only current
 * settings.
 */
export function shownSettings(view: MacSettingsView): ShownSettings | null {
  return view.kind === 'ready' || view.kind === 'kept' ? view : null
}
