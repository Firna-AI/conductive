import { createContext, useContext } from 'react'
import { PanelLeft } from 'lucide-react'
import { useStore } from '../../app/store'
import { useMacApp, useNarrowWindow } from '../mac/mac-app'
import { usePaletteOffer } from '../palette/palette-context'
import { IconButton } from '../ui/actions'
import { usePanelLayout } from './panels'

/**
 * What the sidebar toggle does on a page with the org rail: it hides the
 * sidebar, or it shows the sidebar again. It is off when the page or the
 * width of the window has no sidebar.
 */
export type SidebarToggle = 'hide' | 'show' | 'off'

/**
 * The column of the sidebar shows: the window is wide, and the sidebar
 * toggle does not hide it. The frame, the toggle, the list, and the list
 * popover all read it here.
 */
export function useSidebarShown(): boolean {
  const shown = useStore(usePanelLayout().sidebarShown)
  return !useNarrowWindow() && shown
}

/** The toggle of a frame that has a sidebar, or not. */
export function useSidebarToggle(sidebar: boolean): SidebarToggle {
  const shown = useSidebarShown()
  const narrow = useNarrowWindow()
  if (!sidebar || narrow) return 'off'
  return shown ? 'hide' : 'show'
}

/**
 * Offers Hide the sidebar or Show the sidebar to the command palette, in
 * every host, where the sidebar can show. The offer gives the toggle its
 * keys too.
 */
export function useSidebarOffer(toggle: SidebarToggle): void {
  const panels = usePanelLayout()
  usePaletteOffer(
    toggle === 'off'
      ? null
      : {
          scope: { kind: 'window' },
          actions: [
            {
              id: toggle === 'show' ? 'show-sidebar' : 'hide-sidebar',
              run: panels.toggleSidebar,
            },
          ],
        },
  )
}

/**
 * Where a copy of the sidebar shows: in its column of the frame, or in the
 * list popover of the tile of the current org.
 */
export type SidebarPlace = 'panel' | 'popover'

export const SidebarPlaceContext = createContext<SidebarPlace>('panel')

/** Where the sidebar that renders this shows. */
export function useSidebarPlace(): SidebarPlace {
  return useContext(SidebarPlaceContext)
}

/**
 * The sidebar toggle of the browser, beside the Settings cog. In the
 * column it hides the sidebar, and in the popover it shows it again. The
 * Mac app keeps its toggle beside the window buttons, so it shows none
 * here. A narrow window cannot show the sidebar, so it shows none either.
 */
export function SidebarHeaderToggle() {
  const panels = usePanelLayout()
  const place = useSidebarPlace()
  const narrow = useNarrowWindow()
  const mac = useMacApp()
  if (mac || narrow) return null
  return (
    <IconButton
      icon={PanelLeft}
      label={place === 'popover' ? 'Show the sidebar' : 'Hide the sidebar'}
      onPress={panels.toggleSidebar}
      shortcut="toggle-sidebar"
    />
  )
}
