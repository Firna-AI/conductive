import {
  BRIDGE_MARK_BYTES,
  BRIDGE_MARK_WINDOW,
} from '../../../src/shared/terminal-bridge.ts'

export interface FlowEvents {
  /** Writes a mark for the screen to acknowledge. */
  mark(mark: number): void
  /** The screen acknowledged every mark: rebuild it. */
  catchUp(): void
}

/**
 * Keeps the output that the screen has not acknowledged under a limit. The
 * bridge writes a mark after each window of output bytes, and the screen
 * acknowledges each mark that it parsed. When too many marks wait, the
 * bridge drops the output. When the screen acknowledged every mark, the
 * bridge rebuilds the screen from tmux, so the screen shows the pane as it
 * is then. The bridge keeps reading tmux all the time, because a tmux client
 * that cannot write its output stalls. Counting starts when the screen
 * answers the hello, so a screen that does not know the marks never stops
 * the output.
 */
export class FlowControl {
  private readonly events: FlowEvents
  private enabled = false
  private marks = 0
  private acknowledged = 0
  private sinceMark = 0
  private stopped = false

  constructor(events: FlowEvents) {
    this.events = events
  }

  /** Whether the output is off until the screen catches up. */
  get behind(): boolean {
    return this.stopped
  }

  enable(): void {
    this.enabled = true
  }

  wrote(length: number): void {
    if (!this.enabled || this.stopped) return
    this.sinceMark += length
    if (this.sinceMark < BRIDGE_MARK_BYTES) return
    this.sinceMark = 0
    this.marks += 1
    this.events.mark(this.marks)
    if (this.marks - this.acknowledged >= BRIDGE_MARK_WINDOW)
      this.stopped = true
  }

  acknowledge(mark: number): void {
    this.acknowledged = Math.max(this.acknowledged, Math.min(mark, this.marks))
    if (this.stopped && this.acknowledged === this.marks) {
      this.stopped = false
      this.events.catchUp()
    }
  }
}
