import { useRef, type ReactNode } from 'react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import frame from '../../../docs/mockups/src/components/layout/AppFrame.module.css'
import { useStore } from '../../app/store'
import { useMacApp, useNarrowWindow, type MacChrome } from '../mac/mac-app'
import mac from '../mac/mac.module.css'
import { WindowControls, WindowStrip } from '../mac/WindowControls'
import { PaletteLayer } from '../palette/PaletteLayer'
import { OverlayHost } from '../ui/Overlay'
import { DesktopLayers } from './DesktopLayers'
import layout from './layout.module.css'
import { usePanelWidths } from './panels'
import { ResizeHandle } from './ResizeHandle'

interface FrameProps {
  rail: ReactNode
  sidebar?: ReactNode
  children: ReactNode
}

/** The sidebar of the org, which the user resizes. The Mac app can hide it. */
function SidebarPanel(props: {
  children: ReactNode
  /** The Mac app marks the sidebar that the user hid. */
  hidden?: boolean
}) {
  const widths = useStore(usePanelWidths().widths)
  const sidebar = useRef<HTMLElement>(null)
  return (
    <aside
      aria-label="Workspaces"
      className={classes(
        frame.sidebar,
        props.hidden !== undefined && mac.sidebar,
      )}
      hidden={props.hidden}
      ref={sidebar}
      style={widths.sidebar === null ? undefined : { width: widths.sidebar }}
    >
      {props.children}
      <ResizeHandle
        edge="right"
        label="Resize the sidebar"
        panel="sidebar"
        panelRef={sidebar}
      />
    </aside>
  )
}

/** The desktop app in a browser. */
function BrowserFrame(props: FrameProps) {
  return (
    <div className={frame.frame}>
      <DesktopLayers
        leading={
          <>
            {props.rail}
            {props.sidebar ? (
              <SidebarPanel>{props.sidebar}</SidebarPanel>
            ) : null}
          </>
        }
      >
        {props.children}
      </DesktopLayers>
    </div>
  )
}

/**
 * The desktop app in the Mac app. The window controls top the left panel,
 * over the rail and the sidebar, so they follow the width of the sidebar.
 * When no sidebar shows, they keep their own width in the top left corner,
 * and the top bar of the main area starts after them.
 */
function MacFrame(props: FrameProps & { chrome: MacChrome }) {
  const { mode } = useStore(props.chrome.window.state)
  const hidden = useStore(props.chrome.sidebarHidden)
  const narrow = useNarrowWindow()
  const sidebar = Boolean(props.sidebar) && !narrow
  const shown = sidebar && !hidden
  return (
    <div
      className={classes(
        frame.frame,
        mode === 'full-screen' && mac.fullScreen,
        !shown && mac.cornerFrame,
      )}
    >
      <DesktopLayers
        leading={
          <div className={classes(frame.left, !shown && mac.cornerLeft)}>
            <WindowControls
              chrome={props.chrome}
              placement={shown ? 'panel' : 'corner'}
              toggle={!sidebar ? 'off' : hidden ? 'show' : 'hide'}
            />
            <div className={frame.leftBody}>
              {props.rail}
              {props.sidebar ? (
                <SidebarPanel hidden={hidden}>{props.sidebar}</SidebarPanel>
              ) : null}
            </div>
          </div>
        }
      >
        {props.children}
      </DesktopLayers>
    </div>
  )
}

/**
 * The desktop app: the org rail, the sidebar of the org, and the main area.
 * Below 900 px the sidebar hides, and the org in the rail leads to its
 * list. A page can leave out the sidebar. Its layers come from
 * `DesktopLayers`, as for a page alone.
 */
export function AppFrame(props: FrameProps) {
  const chrome = useMacApp()
  if (chrome) return <MacFrame chrome={chrome} {...props} />
  return <BrowserFrame {...props} />
}

/**
 * A desktop page alone in the window, without the rail and the sidebar,
 * such as Create org or the sign-in. In the Mac app a strip with the
 * window controls tops it. It has the layers of every desktop frame.
 */
export function StandaloneFrame(props: { children: ReactNode }) {
  return (
    <div className={layout.standalone}>
      <DesktopLayers leading={<WindowStrip />}>{props.children}</DesktopLayers>
    </div>
  )
}

/**
 * The phone app: one full-height column with touch targets of 44 px. The
 * Mac app shows it only when a zoom makes the page narrow, so the window
 * controls top it there.
 */
export function PhoneFrame(props: { children: ReactNode }) {
  return (
    <main className={frame.mobile}>
      <OverlayHost>
        <WindowStrip />
        {props.children}
        <PaletteLayer />
      </OverlayHost>
    </main>
  )
}
