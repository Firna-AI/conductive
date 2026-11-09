import { useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import styles from '../../../docs/mockups/src/components/workspace/WorkspaceTabs.module.css'
import { LiftedSessionTab } from './SessionTab'
import type { RenderTab, RowTab } from './tab-row'
import local from './tabs.module.css'

/** The lifted tab keeps this gap to the sides of the window, in CSS px. */
const edge = 4

/**
 * The line where a dragged tab lands. It takes no space, so no tab moves
 * during the drag. The status of the row tells a screen reader the place.
 */
export function DropLine() {
  return (
    <li aria-hidden className={styles.drop}>
      <span className={styles.line}>
        <span className={styles.lineEnd} />
      </span>
    </li>
  )
}

/**
 * The lifted tab under the pointer. It draws above the page, because the
 * row clips what it holds. It hangs below the row with its centre at `x`,
 * and it takes no pointer input. Near a side of the window, it moves in, so
 * that its whole title shows. The host draws the copy of its own tabs.
 */
export function LiftedTab(props: {
  tab: RowTab
  x: number
  top: number
  mobile: boolean
  renderTab?: RenderTab
}) {
  const { tab, x } = props
  const frame = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const node = frame.current
    if (!node) return
    const half = node.offsetWidth / 2
    const centre = Math.min(x, window.innerWidth - half - edge)
    node.style.left = `${Math.max(half + edge, centre)}px`
  }, [x])
  return createPortal(
    <div
      aria-hidden
      className={classes(local.floating, props.mobile && local.touch)}
      ref={frame}
      style={{ top: props.top }}
    >
      {tab.kind === 'session' ? (
        <LiftedSessionTab title={tab.title} />
      ) : (
        props.renderTab?.(tab.tab, { kind: 'lifted' })
      )}
    </div>,
    document.body,
  )
}
