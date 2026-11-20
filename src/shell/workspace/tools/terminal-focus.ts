import { Store } from '../../../app/store'
import type { TerminalFocusRequest } from '../../../terminal/terminalFocus'

/**
 * The request of a workspace screen to move the keyboard focus to its
 * terminal on desktop. A click on the Terminal tab asks for it, and so do
 * Go to Terminal of the palette and its key. New terminal of the palette,
 * the + of the terminal tabs, and a click on a terminal tab ask for it when
 * their terminal shows. A choice of another tool drops it. The tools part
 * passes it to the terminal, and drops it once the terminal took it.
 */
export class TerminalFocus {
  readonly request = new Store<TerminalFocusRequest | null>(null)
  /** Each `clear` ends the wait of each `askOnShow` that started before. */
  private clears = 0

  /** Asks for the focus, from the element that has the focus now. */
  readonly ask = (): void => {
    this.request.set({ from: document.activeElement })
  }

  /** Drops the request and each wait, such as at a choice of another tool. */
  readonly clear = (): void => {
    this.clears += 1
    this.request.set(null)
  }

  /** The terminal took the request, or dropped it after a focus move. */
  readonly done = (): void => {
    this.request.set(null)
  }

  /**
   * Starts a request for a terminal that shows later, such as after the open
   * of the +. It keeps the element that has the focus now, so the terminal
   * takes the focus only while the user did not move it since the press.
   * The result makes the request once the terminal shows. A `clear` before
   * that, such as a choice of another tool, ends the wait, and the result
   * then does nothing.
   */
  readonly askOnShow = (): (() => void) => {
    const from = document.activeElement
    const clears = this.clears
    return () => {
      if (this.clears === clears) this.request.set({ from })
    }
  }
}
