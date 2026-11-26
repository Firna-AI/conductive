import type { SettingsChange } from './device-api'
import { controlOf, type ChangeResult } from './settings-results'

/**
 * One change of the settings of this Mac, from the moment that it takes
 * its control until it ends or the page takes it back. Each take makes a
 * new hold. So a change that waits can tell whether it still holds its
 * control, also when a later change of the same control holds it now.
 */
export interface Hold {
  readonly key: string
  readonly change: SettingsChange
}

/** A change that took its control, and the last result of that control. */
export interface Taken {
  hold: Hold
  last: ChangeResult | undefined
}

/** The record without the entry of one control. */
function without<T>(
  record: Readonly<Record<string, T>>,
  key: string,
): Readonly<Record<string, T>> {
  return Object.fromEntries(
    Object.entries(record).filter(([control]) => control !== key),
  )
}

/**
 * The controls of the settings of this Mac, as `controlOf` names them: the
 * change that holds each control, and the result of the last change of
 * each control. A control has one change at a time. Only the change that
 * holds its control ends it and keeps its result. So a change that the
 * page took back never frees the control from a later change, and keeps
 * no result. Each record is a new value at each change, and keeps its
 * value while nothing changes.
 */
export class SettingsControls {
  private holds: Readonly<Record<string, Hold>> = {}
  private actions: Readonly<Record<string, SettingsChange['action']>> = {}
  private kept: Readonly<Record<string, ChangeResult>> = {}

  /** The action of the change that holds each control, by control. */
  get waiting(): Readonly<Record<string, SettingsChange['action']>> {
    return this.actions
  }

  /** The result of the last change of each control, by control. */
  get results(): Readonly<Record<string, ChangeResult>> {
    return this.kept
  }

  /** Whether a change holds the control of `change`. */
  busy(change: SettingsChange): boolean {
    return Object.hasOwn(this.holds, controlOf(change))
  }

  /**
   * Gives the control of `change` to it, and takes away the result of the
   * last change of that control, which it returns.
   */
  take(change: SettingsChange): Taken {
    const key = controlOf(change)
    const last = Object.hasOwn(this.kept, key) ? this.kept[key] : undefined
    const hold: Hold = { key, change }
    this.hand({ ...this.holds, [key]: hold })
    this.kept = without(this.kept, key)
    return { hold, last }
  }

  /** Whether the change of `hold` still holds its control. */
  has(hold: Hold): boolean {
    return Object.hasOwn(this.holds, hold.key) && this.holds[hold.key] === hold
  }

  /**
   * Ends the change of `hold`: its control is free, and keeps `result`. A
   * change that no longer holds its control changes nothing.
   */
  finish(hold: Hold, result: ChangeResult): void {
    if (!this.has(hold)) return
    this.hand(without(this.holds, hold.key))
    this.kept = { ...this.kept, [hold.key]: result }
  }

  /**
   * Takes back the change that holds the control of `change`, only when it
   * has the action of `change`. Its control is free at once, and the
   * change keeps no result when it ends. Another change of the control,
   * such as a Stop, keeps it. Returns whether a change was taken back.
   */
  cancel(change: SettingsChange): boolean {
    const key = controlOf(change)
    if (!Object.hasOwn(this.holds, key)) return false
    if (this.holds[key].change.action !== change.action) return false
    this.hand(without(this.holds, key))
    return true
  }

  /** Gives each control to its change in `holds`, with its action. */
  private hand(holds: Readonly<Record<string, Hold>>): void {
    this.holds = holds
    this.actions = Object.fromEntries(
      Object.entries(holds).map(([key, hold]) => [key, hold.change.action]),
    )
  }
}
