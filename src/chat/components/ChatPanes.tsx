import { useEffect, useRef, useState, type ReactNode } from 'react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import styles from '../../../docs/mockups/src/components/workspace/SplitColumn.module.css'
import type { PaneSplit } from '../../app/pane-split'
import { useStore } from '../../app/store'
import { PaneHandle } from '../../shell/layout/PaneHandle'
import controls from '../ui/controls.module.css'
import { otherPane, type PaneItem } from './pane-moves'
import { keepsPaneFocus } from './pane-focus'
import type { PanePlan } from './pane-plan'
import { PaneView, type PaneShared } from './PaneView'
import { TabNodes } from './tab-nodes'
import { usePaneMoves } from './usePaneMoves'
import { useTabDrag } from './useTabDrag'

/**
 * The centre column on desktop: one pane, or two panes side by side (split
 * panes decisions 1 C and 2 A), each with its own tab row, its own +, and
 * its page or chat. The clock of the session history ends the right row.
 * With two panes, the row of the focused pane marks its shown tab, and the
 * other row quiets its shown tab. A divider on the hairline between the
 * panes moves the share of the left pane, which the app keeps. A bar of the
 * sandbox that both panes share shows once, below them, as `footer`. Each
 * pane of a split is a size container, so a chat in a pane narrower than
 * 360 px takes the paddings of a phone. `children` are the overlays.
 *
 * One drag serves the rows and the content of both panes, as `useTabDrag`
 * says, so a tab moves into the other row, onto the other pane, or into a
 * new pane on a side of the one pane. The pane item of the tab menu moves a
 * tab to the end of the other row, or into a new right pane. The status of
 * the column says each move to another pane, as `usePaneMoves` says.
 */
export function ChatPanes(
  props: Omit<PaneShared, 'paneItem'> & {
    plans: readonly PanePlan[]
    /** The saved view holds two panes, also when one of them does not show. */
    splitView: boolean
    /** The focused pane of the saved view. */
    focused: 0 | 1
    /** The pane whose chat leads, as `leadPane` says. */
    lead: 0 | 1 | null
    footer: ReactNode
    split: PaneSplit
    children?: ReactNode
  },
) {
  const {
    plans,
    split,
    splitView,
    footer,
    children,
    focused,
    lead,
    ...shared
  } = props
  const { row } = shared
  const panes = useRef<HTMLDivElement>(null)
  const left = useRef<HTMLElement>(null)
  const share = useStore(split.share)
  const [nodes] = useState(() => new TabNodes())
  const rows = plans.map((plan) => plan.tabs)
  const moves = usePaneMoves({ rows, nodes, onMove: row.onMove })
  const drag = useTabDrag({
    rows: plans.map((plan) => ({ tabs: plan.tabs, pane: plan.index })),
    nodes,
    split: splitView,
    enabled: !row.readOnly,
    renaming: row.renaming,
    onPaneMove: (tab, target) => moves.move(tab, target, false),
  })
  const { forget } = moves
  useEffect(() => {
    if (drag.dragging) forget()
  }, [drag.dragging, forget])
  const paneItem: PaneItem = {
    split: splitView,
    move: (tab) => moves.move(tab, otherPane(tab, splitView), true),
  }
  const two = plans.length > 1
  return (
    <div className={classes(styles.column, two && styles.split)}>
      <div className={styles.panes} ref={panes}>
        {plans.map((plan, at) => (
          <PaneView
            {...shared}
            contentRef={drag.contentRef(at)}
            drag={drag.row(at)}
            focused={plan.index === focused}
            key={plan.index}
            last={at === plans.length - 1}
            lead={plan.index === lead}
            mark={drag.mark(at)}
            paneItem={paneItem}
            paneRef={two && at === 0 ? left : undefined}
            plan={plan}
            share={two && at === 0 ? share : null}
            two={two}
          >
            {two && at === 0 ? (
              <div className={styles.divider} {...keepsPaneFocus}>
                <PaneHandle
                  label="Resize the panes"
                  leftRef={left}
                  panesRef={panes}
                  split={split}
                />
              </div>
            ) : null}
          </PaneView>
        ))}
      </div>
      <span className={controls.hidden} role="status">
        {moves.status}
      </span>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
      {children}
    </div>
  )
}
