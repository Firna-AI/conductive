import {
  clampBridgeSize,
  type BridgeSize,
} from '../../../src/shared/terminal-bridge.ts'
import type { PaneState } from './screen.ts'

export interface SizeEvents {
  /** The size of this bridge's terminal device. */
  own(): BridgeSize
  /** Asks tmux to give the window this size. */
  resize(size: BridgeSize): void
  /** Tells the screen a new size of the pane. */
  send(size: BridgeSize): void
}

const same = (one: BridgeSize | null, other: BridgeSize | null) =>
  one !== null &&
  other !== null &&
  one.columns === other.columns &&
  one.rows === other.rows

/** The size of the pane, as the screen shows it, inside the limits. */
function paneSize(state: PaneState): BridgeSize {
  return clampBridgeSize({ columns: state.paneWidth, rows: state.paneHeight })
}

/**
 * Keeps the window of the bridge at the size that all viewers share. A
 * connect, a resize of the device, and the first input after another viewer
 * took the size give the window the size of this device. A size over the
 * limits, such as one that a program set, is taken back at once.
 */
export class SharedSize {
  private readonly events: SizeEvents
  private window: BridgeSize | null = null
  /** The size of the last resize that this bridge asked for. */
  private requested: BridgeSize | null = null
  private sent: BridgeSize | null = null

  constructor(events: SizeEvents) {
    this.events = events
  }

  /** The size for the hello, which the screen gets with the first rebuild. */
  first(state: PaneState): BridgeSize {
    this.window = { columns: state.windowWidth, rows: state.windowHeight }
    if (!same(this.requested, this.window)) this.requested = null
    this.sent = paneSize(state)
    return this.sent
  }

  /** tmux reported the sizes of the window and the pane. */
  changed(state: PaneState): void {
    this.window = { columns: state.windowWidth, rows: state.windowHeight }
    // Another viewer took the size, so the next input takes it back.
    if (!same(this.requested, this.window)) this.requested = null
    if (!same(clampBridgeSize(this.window), this.window)) this.take(true)
    const size = paneSize(state)
    if (same(size, this.sent)) return
    this.sent = size
    this.events.send(size)
  }

  /** Gives the window the size of this device, when it differs. */
  take(always: boolean): void {
    const own = clampBridgeSize(this.events.own())
    if (!always && (same(own, this.window) || same(own, this.requested))) return
    this.requested = own
    this.events.resize(own)
  }
}
