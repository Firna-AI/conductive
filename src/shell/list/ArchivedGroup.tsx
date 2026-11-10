import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import styles from '../../../docs/mockups/src/components/workspaces/SectionList.module.css'
import type { Workspace } from '../../shared/workspaces'
import type { RowMenus } from './row-menu'
import { WorkspaceRow, type RowVariant } from './WorkspaceRow'

/**
 * The archived workspaces at the end of the list (decision 16). The group
 * is the app's own, not a section of the org, so it has no menu, and it is
 * collapsed until the user opens it. The open archived workspace opens it.
 * An archived workspace opens with its chat read-only. An admin's row has
 * a menu that reassigns the workspace.
 */
export function ArchivedGroup(props: {
  rows: readonly Workspace[]
  variant: RowVariant
  selectedId: string | null
  now: number
  menus?: RowMenus
}) {
  const holdsSelected = props.rows.some((row) => row.id === props.selectedId)
  const [opened, setOpened] = useState<boolean | null>(null)
  const open = opened ?? holdsSelected
  const Chevron = open ? ChevronDown : ChevronRight
  return (
    <section aria-label="Archived" className={styles.section}>
      <div className={styles.header}>
        <h3 className={styles.heading}>
          <button
            aria-expanded={open}
            className={styles.toggle}
            onClick={() => setOpened(!open)}
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
                menu={props.menus?.(row)}
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
