import { ChevronDown, ChevronRight } from 'lucide-react'
import { defined } from '../../defined'
import { workspaceRow } from '../../entries/components/workspaces/WorkspaceRow.mockup'
import { instanceKey } from '../../instanceKey'
import type { RowControls } from './RowMenu'
import type { WorkspaceRow } from './sections'
import styles from '../../../../../src/ui/components/workspaces/SectionList.module.css'

/** The one row whose menu, field, or hover a view draws, with what it draws. */
export type DrawnRow = { workspace: string; controls: RowControls }

/**
 * The archived workspaces at the end of the list. The group is the app's
 * own, not a section of the user, so it has no menu, and it is collapsed
 * until the user opens it, with the count of its rows. An archived
 * workspace opens with its chat read-only. While the app keeps its cloud
 * computer, its row offers Restore on hover to every member, except in a
 * suspended org (`readOnly`). When its 14 days end, a workspace leaves the
 * group and its count, and only a link opens it. `drawn` draws the menu
 * that a right click opened on a row, which only an admin has on an
 * archived row.
 */
export function ArchivedGroup(props: {
  rows: readonly WorkspaceRow[]
  open: boolean
  variant: 'sidebar' | 'page'
  readOnly: boolean
  drawn?: DrawnRow
}) {
  const Chevron = props.open ? ChevronDown : ChevronRight
  const { drawn } = props
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
              <workspaceRow.Component
                moklyInstance={instanceKey(row.workspace.key)}
                restorable={!props.readOnly && row.restoreOpen === true}
                row={row}
                variant={props.variant}
                {...defined({
                  controls:
                    drawn?.workspace === row.workspace.key
                      ? drawn.controls
                      : undefined,
                })}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
