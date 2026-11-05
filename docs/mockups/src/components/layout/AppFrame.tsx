import type { ReactNode } from 'react'
import { TouchScreen } from '../common/touch'
import { acmeRail, OrgRail, type RailState } from './OrgRail'
import { ResizeHandle, sidebarWidth } from './ResizeHandle'
import styles from './AppFrame.module.css'

/**
 * The desktop app: the org rail, the sidebar of the org, and the main area.
 * In a narrow window the sidebar hides, and the org in the rail leads to its
 * workspace list. A page outside an org, such as the account, has no
 * sidebar. `overlay` lies over the whole frame, such as an open dialog.
 */
export function AppFrame(props: {
  rail?: RailState
  sidebar?: ReactNode
  overlay?: ReactNode
  children: ReactNode
}) {
  return (
    <div className={styles.frame}>
      <OrgRail {...(props.rail ?? acmeRail)} />
      {props.sidebar ? (
        <aside className={styles.sidebar}>
          {props.sidebar}
          <ResizeHandle
            edge="right"
            label="Resize the sidebar"
            width={sidebarWidth}
          />
        </aside>
      ) : null}
      <main className={styles.main}>{props.children}</main>
      {props.overlay}
    </div>
  )
}

/**
 * The mobile app: one full-height column. Every control in it takes the
 * touch sizes, at least 44px high.
 */
export function MobileFrame(props: { children: ReactNode }) {
  return (
    <TouchScreen>
      <main className={styles.mobile}>{props.children}</main>
    </TouchScreen>
  )
}
