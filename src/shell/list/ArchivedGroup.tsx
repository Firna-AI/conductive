import { ChevronDown, ChevronRight } from 'lucide-react'
import styles from '../../../docs/mockups/src/components/workspaces/SectionList.module.css'
import type { Workspace } from '../../shared/workspaces'
import { WorkspaceRow, type RowVariant } from './WorkspaceRow'

/**
 * Whether the Archived group shows its rows: it is collapsed until the user
 * opens it, and the open archived workspace opens it. The list keeps the
 * choice, because its keys count only the rows that it shows.
 */
export function archivedOpen(
  rows: readonly Workspace[],
  selectedId: string | null,
  opened: boolean | null,
): boolean {
  return opened ?? rows.some((row) => row.id === selectedId)
}

/**
 * The archived workspaces at the end of the list (decision 16). The group
 * is the app's own, not a section of the org, so it has no menu, and it is
 * collapsed until the user opens it, as `archivedOpen` says. An archived
 * workspace opens with its chat read-only.
 */
export function ArchivedGroup(props: {
  rows: readonly Workspace[]
  variant: RowVariant
  selectedId: string | null
  now: number
  open: boolean
  onToggle: (open: boolean) => void
}) {
  const { open } = props
  const Chevron = open ? ChevronDown : ChevronRight
  return (
    <section aria-label="Archived" className={styles.section}>
      <div className={styles.header}>
        <h3 className={styles.heading}>
          <button
            aria-expanded={open}
            className={styles.toggle}
            onClick={() => props.onToggle(!open)}
            type="button"
          >
            <Chevron aria-hidden className={styles.chevron} size={12} />
            <span className={styles.name}>Archived</span>
            {open ? null : (
              <span className={styles.count}>{props.rows.length}</span>
            )}
          </button>
        </h3>
      </div>
      {open ? (
        <ul className={styles.rows}>
          {props.rows.map((row) => (
            <li key={row.id}>
              <WorkspaceRow
                now={props.now}
                selected={row.id === props.selectedId}
                variant={props.variant}
                workspace={row}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
