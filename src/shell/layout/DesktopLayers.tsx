import { useRef, type ReactNode } from 'react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import frame from '../../../docs/mockups/src/components/layout/AppFrame.module.css'
import { NewWorkspaceHost } from '../new-workspace/NewWorkspaceHost'
import { PaletteLayer } from '../palette/PaletteLayer'
import { OverlayHost } from '../ui/Overlay'
import { useScreenFocus } from '../ui/screen-focus'
import layout from './layout.module.css'

/**
 * The main area of a desktop frame. When a layer closes with a move to
 * another screen, it takes the focus, so the next Tab starts in the new
 * screen.
 */
function MainArea(props: { children: ReactNode }) {
  const main = useRef<HTMLElement>(null)
  useScreenFocus(main)
  return (
    <main className={classes(frame.main, layout.screen)} ref={main}>
      {props.children}
    </main>
  )
}

/**
 * The layers and the main area that every desktop frame shares: sheets and
 * dialogs, the New workspace dialog, and the command palette, each over the
 * whole frame. `leading` comes before the main area, such as the rail and
 * the sidebar, or the strip of the window controls. So New workspace opens
 * as the user chose on each desktop page, and each main area can take the
 * focus after a move. A phone has no such dialog: New workspace opens the
 * page there.
 */
export function DesktopLayers(props: {
  leading: ReactNode
  children: ReactNode
}) {
  return (
    <OverlayHost>
      <NewWorkspaceHost>
        {props.leading}
        <MainArea>{props.children}</MainArea>
        <PaletteLayer />
      </NewWorkspaceHost>
    </OverlayHost>
  )
}
