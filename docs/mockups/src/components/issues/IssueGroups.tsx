import type { Viewport } from '@mokly/mokly'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { issueStatusOrder, type Issue } from '../../fixtures/issues'
import { statusLabels } from './issueCopy'
import { IssueRow } from './IssueRow'
import { IssueStatusIcon } from './IssueStatusIcon'
import styles from './IssueGroups.module.css'

/**
 * The issues of the org in one group for each state: In progress first,
 * then In review, Todo, and Backlog. Done shows collapsed, with its count.
 * `links` gives the screen that each issue opens, by its key.
 */
export function IssueGroups(props: {
  issues: readonly Issue[]
  viewport: Viewport
  links?: Readonly<Record<string, string>>
  selected?: string
}) {
  return (
    <div className={styles.groups}>
      {issueStatusOrder.map((status) => {
        const rows = props.issues.filter((issue) => issue.status === status)
        if (rows.length === 0) return null
        const collapsed = status === 'done'
        const Chevron = collapsed ? ChevronRight : ChevronDown
        return (
          <section aria-label={statusLabels[status]} key={status}>
            <h3 className={styles.heading}>
              <Chevron aria-hidden className={styles.chevron} size={12} />
              <IssueStatusIcon status={status} />
              <span>{statusLabels[status]}</span>
              <span className={styles.count}>{rows.length}</span>
            </h3>
            {collapsed ? null : (
              <ul className={styles.rows}>
                {rows.map((issue) => (
                  <li key={issue.key}>
                    <IssueRow
                      issue={issue}
                      selected={props.selected === issue.key}
                      to={props.links?.[issue.key]}
                      viewport={props.viewport}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
