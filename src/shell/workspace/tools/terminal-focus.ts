import { Store } from '../../../app/store'
import type { TerminalFocusRequest } from '../../../terminal/terminalFocus'

/**
 * The request of a workspace screen to move the keyboard focus to its
 * terminal on desktop. A click on the Terminal tab asks for it, and so do
 * Go to Terminal of the palette and its key. A choice of another tool
 * drops it. The tools part passes it to the terminal, and clears it once
 * the terminal took it.
 */
export class TerminalFocus {
  readonly request = new Store<TerminalFocusRequest | null>(null)

  /** Asks for the focus, from the element that has the focus now. */
  readonly ask = (): void => {
    this.request.set({ from: document.activeElement })
  }

  /** Drops the request, such as after the terminal took it. */
  readonly clear = (): void => {
    this.request.set(null)
  }
}
