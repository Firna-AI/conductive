import { useRef, type ReactNode } from 'react'
import frame from '../../../docs/mockups/src/components/layout/AppFrame.module.css'
import { useStore } from '../../app/store'
import { OverlayHost } from '../ui/Overlay'
import { usePanelWidths } from './panels'
import { ResizeHandle } from './ResizeHandle'

/**
 * The desktop app: the org rail, the sidebar of the org, and the main area.
 * Below 900 px the sidebar hides, and the org in the rail leads to its
 * list. A page outside an org, such as the account, has no sidebar.
 * Dialogs open over the whole frame.
 */
export function AppFrame(props: {
  rail: ReactNode
  sidebar?: ReactNode
  children: ReactNode
}) {
  const widths = useStore(usePanelWidths().widths)
  const sidebar = useRef<HTMLElement>(null)
  return (
    <div className={frame.frame}>
      <OverlayHost>
        {props.rail}
        {props.sidebar ? (
          <aside
            aria-label="Workspaces"
            className={frame.sidebar}
            ref={sidebar}
            style={
              widths.sidebar === null ? undefined : { width: widths.sidebar }
            }
          >
            {props.sidebar}
            <ResizeHandle
              edge="right"
              label="Resize the sidebar"
              measure={() => sidebar.current?.clientWidth ?? 0}
              panel="sidebar"
            />
          </aside>
        ) : null}
        <main className={frame.main}>{props.children}</main>
      </OverlayHost>
    </div>
  )
}

/** The phone app: one full-height column with touch targets of 44 px. */
export function PhoneFrame(props: { children: ReactNode }) {
  return (
    <main className={frame.mobile}>
      <OverlayHost>{props.children}</OverlayHost>
    </main>
  )
}
