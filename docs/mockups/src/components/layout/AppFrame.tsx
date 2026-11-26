import type { ReactNode } from 'react'
import { classes } from '../../../../../src/ui/components/common/classes'
import { TouchScreen } from '../../../../../src/ui/components/common/touch'
import { useMacApp } from '../../../../../src/ui/components/mac/MacApp'
import { WindowControls } from '../mac/WindowControls'
import { acmeRail, type RailState } from './OrgRail'
import { orgRail } from '../../entries/components/layout/OrgRail.mockup'
import { sidebarWidth } from '../../../../../src/ui/components/layout/ResizeHandle'
import { resizeHandle } from '../../entries/components/layout/ResizeHandle.mockup'
import {
  CornerControlsProvider,
  SidebarToggleProvider,
  type SidebarView,
} from './sidebarPlace'
import styles from '../../../../../src/ui/components/layout/AppFrame.module.css'

/**
 * The desktop app: the org rail, the sidebar of the org, and the main area.
 * In a narrow window the sidebar hides. A page can leave out the sidebar.
 * `overlay` lies over the whole frame, such as an open dialog.
 * In the Mac app the window controls sit at the top of the left panel,
 * and a banner of the Mac app can top the main area.
 * `sidebarView` hides the sidebar, as its toggle does, or opens it as the
 * popover of the tile of the current org. In the browser the toggle sits
 * beside the cog of the sidebar. In the Mac app it sits beside the window
 * buttons, and the controls move to the top left corner while the sidebar
 * is hidden.
 */
export function AppFrame(props: {
  rail?: RailState
  sidebar?: ReactNode
  sidebarView?: SidebarView
  overlay?: ReactNode
  children: ReactNode
}) {
  const mac = useMacApp()
  const view = props.sidebar ? (props.sidebarView ?? 'shown') : 'shown'
  const corner = mac !== undefined && view !== 'shown'
  const rail = (
    <orgRail.Component
      {...(props.rail ?? acmeRail)}
      popover={view === 'popover'}
    />
  )
  const sidebar =
    props.sidebar && view === 'shown' ? (
      <aside className={styles.sidebar}>
        <SidebarToggleProvider value={mac ? undefined : 'hide'}>
          {props.sidebar}
        </SidebarToggleProvider>
        <resizeHandle.Component
          edge="right"
          label="Resize the sidebar"
          width={sidebarWidth}
        />
      </aside>
    ) : null
  const popover =
    view === 'popover' ? (
      <section
        aria-label="Workspaces"
        className={classes(styles.popover, corner && styles.cornerPopover)}
      >
        <SidebarToggleProvider value={mac ? undefined : 'show'}>
          {props.sidebar}
        </SidebarToggleProvider>
      </section>
    ) : null
  return (
    <div
      className={classes(
        styles.frame,
        corner && mac?.mode === 'full-screen' && styles.fullScreenCorner,
      )}
    >
      {mac ? (
        <div className={classes(styles.left, corner && styles.cornerLeft)}>
          <WindowControls corner={corner} mode={mac.mode} />
          <div className={styles.leftBody}>
            {rail}
            {sidebar}
          </div>
        </div>
      ) : (
        <>
          {rail}
          {sidebar}
        </>
      )}
      <main className={styles.main}>
        {mac?.banner}
        <CornerControlsProvider value={corner}>
          {props.children}
        </CornerControlsProvider>
      </main>
      {popover}
      {props.overlay}
    </div>
  )
}

/**
 * The mobile app: one full-height column. Every control in it takes the
 * touch sizes, at least 40px high.
 */
export function MobileFrame(props: { children: ReactNode }) {
  return (
    <TouchScreen>
      <main className={styles.mobile}>{props.children}</main>
    </TouchScreen>
  )
}
