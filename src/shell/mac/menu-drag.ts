import { useEffect } from 'react'
import { useStore } from '../../app/store'
import type { OpenLayers } from '../ui/layers'
import { useMacApp } from './mac-app'

/**
 * The attribute on the root element while a menu is open in the Mac app.
 * The drag styles of `mac.module.css` read it.
 */
export const MENU_OPEN_ATTRIBUTE = 'data-menu-open'

/**
 * Stops the drag regions of the Mac app while a menu is open. macOS takes
 * each press on a drag region to move the window, and the page never hears
 * that press. So without this, a press on a top bar leaves an open menu
 * open. With it, that press reaches the page, and it closes the menu as a
 * press anywhere else outside the menu does. A browser has no drag
 * regions, so this does nothing there.
 */
export function useMenuDragStop(layers: OpenLayers): void {
  const mac = useMacApp() !== null
  const menuOpen = useStore(layers.anyMenuOpen)
  useEffect(() => {
    if (!mac || !menuOpen) return undefined
    const root = document.documentElement
    root.setAttribute(MENU_OPEN_ATTRIBUTE, '')
    return () => root.removeAttribute(MENU_OPEN_ATTRIBUTE)
  }, [mac, menuOpen])
}
