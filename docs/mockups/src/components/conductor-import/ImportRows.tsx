import type { ConductorRow } from '../../fixtures/conductorImport'
import type { Workspace } from '../../fixtures/workspaces'
import { paths } from '../../paths'
import { WorkspaceChip } from '../chat/WorkspaceChip'
import { ScreenLink } from '../common/ScreenLink'
import { workspaceLabel } from '../workspaces/label'
import styles from './ImportRows.module.css'

/** The sessions of a row in words, such as "3 sessions". */
function sessionCount(count: number): string {
  return count === 1 ? '1 session' : `${count} sessions`
}

/** The repository, the branch, and the sessions of a row, on one line. */
export function RowFacts(props: { row: ConductorRow }) {
  const { row } = props
  return (
    <span className={styles.facts}>
      <span>{row.repository}</span>
      <span aria-hidden>·</span>
      <code className={styles.branch}>{row.branch}</code>
      <span aria-hidden>·</span>
      <span>{sessionCount(row.sessions)}</span>
    </span>
  )
}

/**
 * The workspace that the import made, as a chip with its state, which opens
 * it where the mockups draw it.
 */
export function ImportedChip(props: { workspace: Workspace }) {
  const { workspace } = props
  const to = workspace.key === 'coupon-totals' ? paths.imported : undefined
  return (
    <span className={styles.chip}>
      <WorkspaceChip
        opener={
          to
            ? (chip) => (
                <ScreenLink
                  className={chip.className}
                  title={chip.title}
                  to={to}
                >
                  {chip.children}
                </ScreenLink>
              )
            : undefined
        }
        workspace={{
          label: workspaceLabel(workspace.number),
          name: workspace.name,
          status: workspace.status,
        }}
      />
    </span>
  )
}
