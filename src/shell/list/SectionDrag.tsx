import { createPortal } from 'react-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import styles from '../../../docs/mockups/src/components/workspaces/SectionList.module.css'
import ui from '../ui/ui.module.css'
import type { SectionDragState } from './useSectionDrag'
import list from './list.module.css'

/**
 * The line in the gap between two sections where a dragged section lands.
 * It takes no room, so the sections do not move while the drag lasts.
 * `place` counts from 1.
 */
export function SectionDropLine(props: { name: string; place: number }) {
  return (
    <div className={styles.sectionDrop}>
      <span aria-hidden className={styles.sectionLine}>
        <span className={styles.lineEnd} />
      </span>
      <span className={ui.hidden} role="status">
        Moving {props.name} to place {props.place}
      </span>
    </div>
  )
}

/**
 * The header of the dragged section under the pointer. It shows the name
 * and the count of the section, also while the section is open, so that
 * it says how many workspaces move with it. It takes no pointer input.
 */
export function LiftedSection(props: {
  drag: SectionDragState
  count: number
}) {
  const { drag } = props
  const Chevron = drag.item.collapsed ? ChevronRight : ChevronDown
  return createPortal(
    <div
      aria-hidden
      className={list.lifted}
      style={{
        left: drag.x - drag.offsetX,
        top: drag.y - drag.offsetY,
        width: drag.box.width,
      }}
    >
      <span className={styles.liftedSection}>
        <Chevron aria-hidden className={styles.chevron} size={12} />
        <span className={styles.name}>{drag.item.name}</span>
        <span className={styles.count}>{props.count}</span>
      </span>
    </div>,
    document.body,
  )
}
