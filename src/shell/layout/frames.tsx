import { useRef, type ReactNode } from 'react'
import { classes } from '../../ui/components/common/classes'
import frame from '../../ui/components/layout/AppFrame.module.css'
import { useStore } from '../../app/store'
import { useMacApp, type MacChrome } from '../mac/mac-app'
import mac from '../mac/mac.module.css'
import { WindowControls, WindowStrip } from '../mac/WindowControls'
import { FeedbackLayer } from '../feedback/FeedbackLayer'
import { PaletteLayer } from '../palette/PaletteLayer'
import { OverlayHost } from '../ui/Overlay'
import { DesktopLayers } from './DesktopLayers'
import layout from './layout.module.css'
import { usePanelLayout } from './panels'
import { ResizeHandle } from './ResizeHandle'
import { useSidebarOffer, useSidebarToggle } from './sidebar-toggle'

interface FrameProps {
  rail: ReactNode
  sidebar?: ReactNode
  children: ReactNode
}

/**
 * The sidebar of the org, which the user resizes. Its toggle hides it. A
 * hidden sidebar stays mounted, so its list keeps its state.
 */
function SidebarPanel(props: { children: ReactNode; hidden: boolean }) {
  const width = useStore(usePanelLayout().chosenWidth.sidebar)
  const sidebar = useRef<HTMLElement>(null)
  return (
    <aside
      aria-label="Workspaces"
      className={frame.sidebar}
      hidden={props.hidden}
      ref={sidebar}
      style={width === null ? undefined : { width }}
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

/** The desktop app in a browser. Its sidebar toggle sits beside Settings. */
function BrowserFrame(props: FrameProps) {
  const toggle = useSidebarToggle(Boolean(props.sidebar))
  useSidebarOffer(toggle)
  const shown = useStore(usePanelLayout().sidebarShown)
  return (
    <div className={frame.frame}>
      <DesktopLayers
        leading={
          <>
            {props.rail}
            {props.sidebar ? (
              <SidebarPanel hidden={!shown}>{props.sidebar}</SidebarPanel>
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
  const hidden = !useStore(usePanelLayout().sidebarShown)
  const toggle = useSidebarToggle(Boolean(props.sidebar))
  useSidebarOffer(toggle)
  const shown = toggle === 'hide'
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
              toggle={toggle}
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
 * The sidebar toggle hides the sidebar, and below 900 px it hides too.
 * Then the tile of the current org opens the list as a popover, as
 * `ListPopover` says. A page can leave out the sidebar. Its layers come
 * from `DesktopLayers`, as for a page alone.
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
export function StandaloneFrame(props: {
  children: ReactNode
  /** The page draws its own top bar, as the waitlist does in the Mac app. */
  ownBar?: boolean
}) {
  return (
    <div className={layout.standalone}>
      <DesktopLayers leading={props.ownBar ? null : <WindowStrip />}>
        {props.children}
      </DesktopLayers>
    </div>
  )
}

/**
 * The phone app: one full-height column with touch targets of 40 px. The
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
        <FeedbackLayer />
      </OverlayHost>
    </main>
  )
}
