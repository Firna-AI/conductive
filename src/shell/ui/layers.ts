import { createContext, useContext, useEffect, useRef } from 'react'

/**
 * The menus and the modal layers that are open on the page, in each UI kit
 * of the app: the shell, the chat, and the members UI. The command palette
 * reads them: its key does nothing while a dialog or a sheet is open, and
 * it closes each open menu before it opens.
 */
export class OpenLayers {
  private readonly menus = new Set<{ close: () => void }>()
  private modals = 0

  /** Notes an open menu until the result runs. `close` closes it. */
  addMenu(close: () => void): () => void {
    const menu = { close }
    this.menus.add(menu)
    return () => {
      this.menus.delete(menu)
    }
  }

  /** Notes an open dialog or sheet until the result runs. */
  addModal(): () => void {
    this.modals += 1
    let open = true
    return () => {
      if (!open) return
      open = false
      this.modals -= 1
    }
  }

  /** A dialog or a sheet is open. */
  get modalOpen(): boolean {
    return this.modals > 0
  }

  /** Closes each open menu. */
  closeMenus(): void {
    for (const menu of [...this.menus]) menu.close()
  }
}

/** The open layers of the app. Without a provider, a layer notes nothing. */
export const LayersContext = createContext<OpenLayers | null>(null)

/** Notes a menu while `open`. `close` closes it, as Escape does. */
export function useMenuLayer(open: boolean, close: () => void): void {
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

/** Notes a dialog or a sheet while `open`. */
export function useModalLayer(open = true): void {
  const layers = useContext(LayersContext)
  useEffect(() => {
    if (!open || !layers) return undefined
    return layers.addModal()
  }, [open, layers])
}
