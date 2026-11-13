import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import type { MenuEntry } from '../common/Menu'
import { classes } from '../common/classes'
import { ResizeHandle, type PanelWidth } from '../layout/ResizeHandle'
import { PaneDrop, type ContentDrop } from './PaneDrop'
import type { PaneSide } from './paneCopy'
import type { WorkspaceTab } from './TabItem'
import { WorkspaceTabs, type TabDrag } from './WorkspaceTabs'
import styles from './SplitColumn.module.css'

/** One pane of the centre column: its own tab row, and its shown tab. */
export type Pane = {
  side: PaneSide
  /** The tabs of its row, in order. `selected` marks its shown tab. */
  tabs: readonly WorkspaceTab[]
  /** What its shown tab shows: a chat or a file. */
  content: ReactNode
  drag?: TabDrag
  /** The drop mark over its content during a drag. */
  drop?: ContentDrop
}

/**
 * The one row of a phone or of a narrow column: the tabs of the left pane,
 * then the tabs of the right pane, from the index `border`.
 */
export type OneRow = {
  tabs: readonly WorkspaceTab[]
  border?: number
  drag?: TabDrag
}

/**
 * The divider moves the share of the left pane, in percent. A drag stops
 * where a pane would get narrower than 320 px.
 */
const paneShare: PanelWidth = { value: 50, min: 0, max: 100 }

/** The names of a pane and of its row for a screen reader. */
const paneNames: Readonly<Record<PaneSide, { pane: string; row: string }>> = {
  left: { pane: 'Left pane', row: 'Sessions and files of the left pane' },
  right: { pane: 'Right pane', row: 'Sessions and files of the right pane' },
}

/**
 * The centre column under the header, with one pane or two panes side by
 * side (split panes decisions 1 C and 2 A). Each pane has its own tab row
 * with its own +, and the clock of the session history ends the right row.
 * The row of the focused pane marks its shown tab. A divider between the
 * panes moves the split. A pane that shows a session has its own message
 * field, and `footer` holds a bar that both panes share.
 *
 * A phone, and a centre column narrower than two panes of 320 px, show one
 * row with the tabs of both panes, and the shown tab of the focused pane.
 */
export function SplitColumn(props: {
  panes: readonly Pane[]
  /** The index of the focused pane in `panes`. */
  focused: number
  row: OneRow
  viewport: Viewport
  readOnly: boolean
  historyEntries: readonly MenuEntry[]
  footer?: ReactNode
  /**
   * The share of the left pane, in percent, while the user drags the
   * divider. A pane keeps its 320 px also then.
   */
  share?: number
}) {
  const { panes, focused, viewport, readOnly, historyEntries, share } = props
  const phone = viewport === 'mobile'
  const split = panes.length > 1
  const oneRow = (
    <WorkspaceTabs
      border={props.row.border}
      drag={props.row.drag}
      historyEntries={historyEntries}
      readOnly={readOnly}
      tabs={props.row.tabs}
      viewport={viewport}
    />
  )
  const footer = props.footer ? (
    <div className={classes(styles.footer, phone && styles.phoneFooter)}>
      {props.footer}
    </div>
  ) : null
  if (phone) {
    return (
      <>
        {oneRow}
        <div className={styles.content}>{panes[focused]?.content}</div>
        {footer}
      </>
    )
  }
  return (
    <div className={classes(styles.column, split && styles.split)}>
      {split ? <div className={styles.oneRow}>{oneRow}</div> : null}
      <div className={styles.panes}>
        {panes.map((pane, index) => (
          <section
            aria-label={split ? paneNames[pane.side].pane : undefined}
            className={classes(styles.pane, index !== focused && styles.other)}
            key={pane.side}
            style={
              split && index === 0 && share !== undefined
                ? { flex: `0 1 ${share}%` }
                : undefined
            }
          >
            <div className={styles.paneRow}>
              <WorkspaceTabs
                drag={pane.drag}
                focused={split ? index === focused : undefined}
                history={index === panes.length - 1}
                historyEntries={historyEntries}
                label={split ? paneNames[pane.side].row : undefined}
                readOnly={readOnly}
                tabs={pane.tabs}
                viewport={viewport}
              />
            </div>
            <div className={styles.content}>
              {pane.content}
              {pane.drop ? <PaneDrop {...pane.drop} /> : null}
            </div>
            {split && index === 0 ? (
              <div className={styles.divider}>
                <ResizeHandle
                  active={share !== undefined}
                  edge="right"
                  label="Resize the panes"
                  width={{ ...paneShare, value: share ?? paneShare.value }}
                />
              </div>
            ) : null}
          </section>
        ))}
      </div>
      {footer}
    </div>
  )
}
