import type { KeyPress } from '../services'
import { LayoutSwitchKeys } from './layout-switch'

/** The key presses of the page, which come only when the test says so. */
export class ManualKeys {
  private readonly listeners = new Set<(press: KeyPress) => void>()
  private readonly switches = new LayoutSwitchKeys()
  readonly layoutModifiers = () => this.switches.modifiers()

  readonly onKey = Object.assign(
    (listener: (press: KeyPress) => void): (() => void) => {
      this.listeners.add(listener)
      return () => {
        this.listeners.delete(listener)
      }
    },
    { layoutModifiers: this.layoutModifiers },
  )

  /** The person presses a key. */
  press(press: Omit<KeyPress, 'layoutModifiers'>): void {
    this.switches.down(press)
    for (const listener of [...this.listeners])
      listener({ ...press, layoutModifiers: this.layoutModifiers() })
  }

  /** Releases the physical key, even when its reported character changed. */
  release(code: string): void {
    this.switches.up(code)
  }

  /** Clears a missed key-up when the window loses focus. */
  blur(): void {
    this.switches.clear()
  }
}
