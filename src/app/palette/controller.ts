import { Store } from '../store'
import type { PaletteOffer } from './page-actions'

/**
 * The command palette of one tab: whether it shows, and what the parts of
 * the page offer to it. The palette has no address, so it keeps no state
 * of its own after it closes.
 */
export class PaletteController {
  readonly open = new Store(false)
  /** What the parts of the page offer while they show, in the order of their offers. */
  readonly offers = new Store<readonly PaletteOffer[]>([])
  private pending: (() => void) | null = null

  show(): void {
    this.open.set(true)
  }

  /**
   * Closes the palette. `then`, such as the action of a row, runs when the
   * shell calls `settle`, once the palette left the page. So the result of
   * the action, such as a question, shows alone. A closed palette runs
   * `then` at once.
   */
  close(then?: () => void): void {
    if (!this.open.get()) {
      then?.()
      return
    }
    this.pending = then ?? null
    this.open.set(false)
  }

  toggle(): void {
    if (this.open.get()) this.close()
    else this.show()
  }

  /** Runs the action that waited for the close, once. */
  settle(): void {
    const run = this.pending
    this.pending = null
    run?.()
  }

  /** A part of the page offers actions. The result takes them back. */
  offer(offer: PaletteOffer): () => void {
    this.offers.change((offers) => [...offers, offer])
    return () =>
      this.offers.change((offers) => offers.filter((item) => item !== offer))
  }
}
