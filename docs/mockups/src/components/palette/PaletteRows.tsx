import type { ReactNode } from 'react'
import { repositories } from '../../fixtures/repositories'
import { GitHubMark } from '../common/GitHubMark'
import { ScreenLink } from '../common/ScreenLink'
import a11y from '../common/a11y.module.css'
import { classes } from '../common/classes'
import { OrgTile } from '../orgs/OrgTile'
import { activityPresentation } from '../workspaces/status'
import { StatusGlyph } from '../workspaces/StatusGlyph'
import type { CommandLead } from './paletteCommands'
import type { PaletteGroup, PaletteRow } from './paletteContent'
import styles from './CommandPalette.module.css'

function Lead(props: { lead: CommandLead }) {
  const { lead } = props
  switch (lead.kind) {
    case 'icon': {
      const Icon = lead.icon
      return <Icon aria-hidden className={styles.icon} size={14} />
    }
    case 'org':
      return <OrgTile org={lead.org} size={16} />
    case 'github':
      return <GitHubMark className={styles.icon} size={14} />
  }
}

/** A row that opens a screen of the catalogue, or a row without one. */
function RowLink(props: {
  to?: string
  className: string
  children: ReactNode
}) {
  if (!props.to) return <div className={props.className}>{props.children}</div>
  return (
    <ScreenLink className={props.className} to={props.to}>
      {props.children}
    </ScreenLink>
  )
}

/**
 * One result. A workspace shows its state mark, its name, its repository,
 * and the age of its last activity, as the list does. A command shows its
 * icon, its label, and the page of a setting in a mixed list.
 */
function Row(props: { row: PaletteRow; highlighted: boolean }) {
  const { row, highlighted } = props
  if (row.kind === 'workspace') {
    const { workspace, status, to } = row.row
    const presentation = activityPresentation[status]
    return (
      <RowLink
        className={classes(
          styles.row,
          styles[presentation.emphasis],
          highlighted && styles.highlighted,
        )}
        to={to}
      >
        <span className={styles.lead}>
          <StatusGlyph status={status} />
        </span>
        <span className={styles.label}>{workspace.name}</span>
        <span className={styles.repository}>
          {repositories[workspace.repository].name}
        </span>
        <span className={styles.end}>{workspace.updated}</span>
        <span className={a11y.hidden}>, {presentation.label}</span>
      </RowLink>
    )
  }
  const { command, detail } = row
  return (
    <RowLink
      className={classes(styles.row, highlighted && styles.highlighted)}
      to={command.to}
    >
      <span className={styles.lead}>
        <Lead lead={command.lead} />
      </span>
      <span className={styles.label}>{command.label}</span>
      {detail ? <span className={styles.detail}>{detail}</span> : null}
    </RowLink>
  )
}

/** The answer to a query that matches nothing. */
function NoResults(props: { query: string }) {
  return (
    <div className={styles.empty} role="status">
      <p className={styles.emptyTitle}>Nothing matches “{props.query}”</p>
      <p className={styles.emptyBody}>
        Try a workspace name, a branch, or a repository.
      </p>
    </div>
  )
}

/** The line of a tab that has no row to show while the field is empty. */
function EmptyTab(props: { line: string }) {
  return (
    <div className={styles.empty} role="status">
      <p className={styles.emptyBody}>{props.line}</p>
    </div>
  )
}

/**
 * The results in their groups. The first row is highlighted, so Enter runs
 * it. The list scrolls under the search field and the tabs. `empty` is the
 * line of a tab without rows while the field is empty.
 */
export function PaletteResults(props: {
  groups: readonly PaletteGroup[]
  query: string
  empty?: string
}) {
  if (props.groups.length === 0) {
    return props.empty ? (
      <EmptyTab line={props.empty} />
    ) : (
      <NoResults query={props.query} />
    )
  }
  const first = props.groups[0]?.rows[0]
  return (
    <div className={styles.results} data-mokly-scroll="palette-results">
      {props.groups.map((group) => (
        <section
          aria-label={group.label}
          className={styles.group}
          key={group.label}
        >
          <h3 className={styles.groupLabel}>{group.label}</h3>
          <ul className={styles.rows}>
            {group.rows.map((row) => (
              <li
                key={
                  row.kind === 'workspace'
                    ? row.row.workspace.key
                    : row.command.label
                }
              >
                <Row highlighted={row === first} row={row} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
