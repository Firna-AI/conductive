import type { ShortcutCommandId } from '../../shared/shortcut-commands'
import type { LayerOwner, OpenLayers } from '../ui/layers'

/** A command that a part of the page offers to the keys while it shows. */
export interface ShortcutOffer {
  readonly command: ShortcutCommandId
  /** Does what the control of the page does. */
  readonly run: () => void
  /**
   * The owner of the dialog or the sheet that the command opens, such as
   * the palette for its own dialog. While only that layer is open, the
   * keys run this command, and no other.
   */
  readonly layer?: LayerOwner
}

/**
 * The commands that the parts of the page offer to the keys, in the order
 * of their offers. When two parts offer the same command, the latest offer
 * runs it.
 */
export class ShortcutOffers {
  private offers: readonly ShortcutOffer[] = []

  /** A part of the page offers a command. The result takes it back. */
  offer(offer: ShortcutOffer): () => void {
    this.offers = [...this.offers, offer]
    return () => {
      this.offers = this.offers.filter((item) => item !== offer)
    }
  }

  /** Each command that the page offers now. */
  commands(): ReadonlySet<ShortcutCommandId> {
    return new Set(this.offers.map((offer) => offer.command))
  }

  /**
   * While a dialog or a sheet is open: the offered command whose layer is
   * every open one, or null when a layer of another owner is open.
   */
  layerCommand(
    layers: Pick<OpenLayers, 'modalOpen'>,
  ): ShortcutCommandId | null {
    const owner = this.offers.findLast(
      (offer) => offer.layer !== undefined && !layers.modalOpen(offer.layer),
    )
    return owner?.command ?? null
  }

  /** Runs the latest offer of the command. */
  run(command: ShortcutCommandId): void {
    this.offers.findLast((offer) => offer.command === command)?.run()
  }
}
