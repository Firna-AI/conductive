import { Store } from '../store'
import type { PaletteOffer } from './page-actions'

/** The open layers of the page, as the palette reads them before it opens. */
export interface PaletteLayers {
  /** A dialog or a sheet is open, other than the layers of `except`. */
  modalOpen(except?: object): boolean
  /** Asks each open menu to close. Says whether every one closed. */
  closeMenus(): boolean
}

/**
 * The command palette of one tab: whether it shows, and what the parts of
 * the page offer to it. The palette has no address, so it keeps no state
 * of its own after it closes. Its own dialog has the controller as its
 * owner among the open layers.
 */
export class PaletteController {
  readonly open = new Store(false)
  /** What the parts of the page offer while they show, in the order of their offers. */
  readonly offers = new Store<readonly PaletteOffer[]>([])
  private readonly layers: PaletteLayers
  private pending: (() => void) | null = null

  constructor(layers: PaletteLayers) {
    this.layers = layers
  }

  /**
   * Opens the palette. Each way to open it calls this: the key and the
   * Search row. While a dialog or a sheet holds the input, or an open menu
   * does not close, such as during a change that it runs, the palette
   * stays closed. Says whether the palette is open.
   */
  show(): boolean {
    if (this.open.get()) return true
    if (this.layers.modalOpen(this) || !this.layers.closeMenus()) return false
    this.open.set(true)
    return true
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
