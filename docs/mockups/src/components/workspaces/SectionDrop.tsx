import { ChevronDown, ChevronRight } from 'lucide-react'
import a11y from '../common/a11y.module.css'
import type { SidebarSection } from './sections'
import styles from './SectionList.module.css'

/**
 * The header of a dragged section, lifted under the pointer. It shows the
 * name and the count of the section, also while the section is open, so
 * that it says how many workspaces move with it.
 */
function LiftedSectionHeader(props: { item: SidebarSection }) {
  const { section, rows } = props.item
  const Chevron = section.collapsed ? ChevronRight : ChevronDown
  return (
    <span className={styles.liftedSection}>
      <Chevron aria-hidden className={styles.chevron} size={12} />
      <span className={styles.name}>{section.name}</span>
      <span className={styles.count}>{rows.length}</span>
    </span>
  )
}

/**
 * Where a dragged section lands: a line in the gap between two sections,
 * and the lifted header under the pointer. The line takes no room, so the
 * sections do not move while the drag lasts. `place` counts from 1.
 */
export function SectionDrop(props: { item: SidebarSection; place: number }) {
  return (
    <div className={styles.sectionDrop}>
      <span aria-hidden className={styles.sectionLine}>
        <span className={styles.lineEnd} />
      </span>
      <span aria-hidden className={styles.sectionLift}>
        <LiftedSectionHeader item={props.item} />
      </span>
      <span className={a11y.hidden} role="status">
        Moving {props.item.section.name} to place {props.place}
      </span>
    </div>
  )
}
