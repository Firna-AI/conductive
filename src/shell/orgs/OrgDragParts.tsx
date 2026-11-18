import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import orgDrag from '../../../docs/mockups/src/components/orgs/OrgDrag.module.css'
import type { LiftedFrame } from './useOrgDrag'
import local from './orgs.module.css'

/** The list where an org moves: the rail, or the org switcher of a phone. */
export type OrgDragAt = 'rail' | 'sheet'

/**
 * The line where a dragged org lands. It takes no space, so no org moves
 * during the drag. The status of the list tells a screen reader the place.
 */
export function OrgDropLine(props: { at: OrgDragAt }) {
  return (
    <li
      aria-hidden
      className={props.at === 'rail' ? orgDrag.railDrop : orgDrag.sheetDrop}
    >
      <span className={orgDrag.line}>
        <span className={orgDrag.lineEnd} />
      </span>
    </li>
  )
}

/**
 * The lifted org as a raised card above the page, so that no part of the
 * frame clips or covers it. It follows the pointer up and down, and it
 * takes no pointer input. On the rail, the tile hangs over the edge of the
 * rail, so the initials of the tiles that it passes still show. In the org
 * switcher, the row starts right of the squares of the rows.
 */
export function LiftedOrg(props: {
  at: OrgDragAt
  frame: LiftedFrame
  children: ReactNode
}) {
  const { frame } = props
  return createPortal(
    <div
      aria-hidden
      className={local.liftedFrame}
      style={{ top: frame.top, left: frame.left, width: frame.width }}
    >
      <span
        className={classes(
          orgDrag.lifted,
          props.at === 'rail' ? orgDrag.liftedTile : orgDrag.liftedRow,
        )}
      >
        {props.children}
      </span>
    </div>,
    document.body,
  )
}
