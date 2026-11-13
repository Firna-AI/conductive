import a11y from '../common/a11y.module.css'
import { classes } from '../common/classes'
import { LiftedTab, type WorkspaceTab } from './TabItem'
import styles from './PaneDrop.module.css'

/**
 * Where a dragged tab lands over the content of a pane: the left or the
 * right half of the one pane, which opens the second pane on that side, or
 * the whole pane of a split, which takes the tab at the end of its row.
 */
export type ContentDrop = {
  area: 'left' | 'right' | 'pane'
  tab: WorkspaceTab
  /** What the status of the row tells a screen reader, from `moveStatus`. */
  status: string
}

/** The half that the mark covers, if any, and the place of the pointer. */
const places: Readonly<
  Record<ContentDrop['area'], { half?: string; pointer: string }>
> = {
  left: { half: styles.left, pointer: styles.pointerLeft },
  right: { half: styles.right, pointer: styles.pointerRight },
  pane: { pointer: styles.pointerPane },
}

/**
 * The drop mark of a drag over the content of a pane (split panes decision
 * 1 C): the area where the tab lands, with an outline in the accent colour
 * over a light tint, and the lifted tab under the pointer. The content
 * stays readable under the tint. A narrow centre column opens no second
 * pane, so it hides the mark, and its status with it.
 */
export function PaneDrop(props: ContentDrop) {
  const place = places[props.area]
  return (
    <div className={styles.layer}>
      <div className={classes(styles.mark, place.half)}>
        <span className={a11y.hidden} role="status">
          {props.status}
        </span>
      </div>
      <LiftedTab
        className={classes(styles.lifted, place.pointer)}
        tab={props.tab}
      />
    </div>
  )
}
