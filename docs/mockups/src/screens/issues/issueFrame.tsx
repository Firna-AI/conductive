import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { AppFrame, MobileFrame } from '../../components/layout/AppFrame'
import { acmeRail } from '../../components/layout/OrgRail'

/**
 * The frame of a page of the explorations: the org rail, the sidebar, and
 * the main area on desktop, or one column on a phone. `overlay` lies over
 * the whole frame, such as a dialog.
 */
export function IssueFrame(props: {
  viewport: Viewport
  sidebar: ReactNode
  overlay?: ReactNode
  children: ReactNode
}) {
  if (props.viewport === 'mobile') {
    return (
      <MobileFrame>
        {props.children}
        {props.overlay}
      </MobileFrame>
    )
  }
  return (
    <AppFrame overlay={props.overlay} rail={acmeRail} sidebar={props.sidebar}>
      {props.children}
    </AppFrame>
  )
}
