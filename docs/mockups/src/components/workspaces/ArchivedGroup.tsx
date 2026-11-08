import { ChevronDown, ChevronRight } from 'lucide-react'
import type { WorkspaceRow } from './sections'
import { WorkspaceRowView } from './WorkspaceRow'
import styles from './SectionList.module.css'

/**
 * The archived workspaces at the end of the list, from decision 16. The
 * group is the app's own, not a section of the user, so it has no menu,
 * and it is collapsed until the user opens it. An archived workspace opens
 * with its chat read-only.
 */
export function ArchivedGroup(props: {
  rows: readonly WorkspaceRow[]
  open: boolean
  variant: 'sidebar' | 'page'
}) {
  const Chevron = props.open ? ChevronDown : ChevronRight
  return (
    <section aria-label="Archived" className={styles.section}>
      <div className={styles.header}>
        <h3 className={styles.heading}>
          <button
            aria-expanded={props.open}
            className={styles.toggle}
            type="button"
          >
            <Chevron aria-hidden className={styles.chevron} size={12} />
            <span className={styles.name}>Archived</span>
            {props.open ? null : (
              <span className={styles.count}>{props.rows.length}</span>
            )}
          </button>
        </h3>
      </div>
      {props.open ? (
        <ul className={styles.rows}>
          {props.rows.map((row) => (
            <li key={row.workspace.key}>
              <WorkspaceRowView row={row} variant={props.variant} />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
