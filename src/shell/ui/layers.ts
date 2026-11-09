import { createContext, useContext, useEffect, useRef } from 'react'

/**
 * What holds a modal layer, such as the command palette, which holds its
 * own dialog. A layer without an owner is its own owner.
 */
export type LayerOwner = object

/**
 * The menus and the modal layers that are open on the page, in each UI kit
 * of the app: the shell, the chat, and the members UI. The command palette
 * reads them: it opens only when no dialog or sheet of another owner holds
 * the input, and when every open menu closed.
 */
export class OpenLayers {
  private readonly menus = new Set<{ close: () => boolean }>()
  private readonly modals = new Set<{ owner: LayerOwner }>()

  /**
   * Notes an open menu until the result runs. `close` asks it to close,
   * and says whether it closed. A menu whose change runs can refuse.
   */
  addMenu(close: () => boolean): () => void {
    const menu = { close }
    this.menus.add(menu)
    return () => {
      this.menus.delete(menu)
    }
  }

  /** Notes an open dialog or sheet of `owner` until the result runs. */
  addModal(owner: LayerOwner = {}): () => void {
    const modal = { owner }
    this.modals.add(modal)
    return () => {
      this.modals.delete(modal)
    }
  }

  /**
   * A dialog or a sheet is open. The layers of `except`, such as the
   * dialog of the palette itself, do not count.
   */
  modalOpen(except?: LayerOwner): boolean {
    return [...this.modals].some((modal) => modal.owner !== except)
  }

  /** Asks each open menu to close. Says whether every one closed. */
  closeMenus(): boolean {
    let closed = true
    for (const menu of [...this.menus]) closed = menu.close() && closed
    return closed
  }
}

/** The open layers of the app. Without a provider, a layer notes nothing. */
export const LayersContext = createContext<OpenLayers | null>(null)

/**
 * Notes a menu while `open`. `close` closes it, as Escape does, and says
 * whether it closed.
 */
export function useMenuLayer(open: boolean, close: () => boolean): void {
  const layers = useContext(LayersContext)
  const latest = useRef(close)
  useEffect(() => {
    latest.current = close
  })
  useEffect(() => {
    if (!open || !layers) return undefined
    return layers.addMenu(() => latest.current())
  }, [open, layers])
}

/** Notes a dialog or a sheet of `owner` while `open`. */
export function useModalLayer(open = true, owner?: LayerOwner): void {
  const layers = useContext(LayersContext)
  useEffect(() => {
    if (!open || !layers) return undefined
    return layers.addModal(owner)
  }, [open, layers, owner])
}
