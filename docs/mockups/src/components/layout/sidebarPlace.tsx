import { createContext, useContext } from 'react'

/**
 * How the desktop frame shows the sidebar of the org: in its column, hidden
 * with the sidebar toggle, or hidden with the workspace list open as a
 * popover beside the tile of the current org.
 */
export type SidebarView = 'shown' | 'hidden' | 'popover'

/**
 * What the toggle beside Settings does in one copy of the sidebar. The
 * browser draws it: Hide in the column, and Show in the popover. The Mac
 * app keeps its toggle beside the window buttons, so it draws none there.
 */
export type SidebarToggle = 'hide' | 'show'

const ToggleContext = createContext<SidebarToggle | undefined>(undefined)

export const SidebarToggleProvider = ToggleContext.Provider

/** The toggle of the sidebar that draws it, or none. */
export function useSidebarToggle(): SidebarToggle | undefined {
  return useContext(ToggleContext)
}

const CornerContext = createContext(false)

export const CornerControlsProvider = CornerContext.Provider

/**
 * The window controls of the Mac app sit in the top left corner, because
 * no sidebar shows. A top bar of the main area then starts after them.
 */
export function useCornerControls(): boolean {
  return useContext(CornerContext)
}
