import type { ActivityStatus } from '../../fixtures/workspaces'
import {
  runningComputers,
  workspaceStateCounts,
  type WorkspaceStateKey,
} from '../../fixtures/operator'
import { Section, SectionText } from '../settings/Section'
import { StatusGlyph } from '../workspaces/StatusGlyph'
import styles from './WorkspaceStates.module.css'

/** The name of each state, and the glyph that the workspace list draws. */
const states: Readonly<
  Record<WorkspaceStateKey, { label: string; glyph: ActivityStatus }>
> = {
  running: { label: 'Running', glyph: 'ready' },
  stopped: { label: 'Stopped', glyph: 'stopped' },
  failed: { label: 'Failed', glyph: 'error' },
  archived: { label: 'Archived', glyph: 'archived' },
}

/** A share as a whole percent, or with one decimal below 1%. */
function share(count: number, total: number): string {
  const percent = (count / total) * 100
  return percent < 1 ? `${percent.toFixed(1)}%` : `${Math.round(percent)}%`
}

/**
 * The workspaces of every org in each state, with the glyph of the
 * workspace list, so that a state never depends on colour alone. A line
 * under the list names the builds that Running now also counts.
 */
export function WorkspaceStates() {
  const total = workspaceStateCounts.reduce((sum, row) => sum + row.count, 0)
  return (
    <Section title="Workspaces">
      <ul aria-label="Workspaces by state" className={styles.list}>
        {workspaceStateCounts.map((row) => (
          <li className={styles.row} key={row.key}>
            <StatusGlyph status={states[row.key].glyph} />
            <span className={styles.label}>{states[row.key].label}</span>
            <span className={styles.count}>
              {row.count.toLocaleString('en')}
            </span>
            <span className={styles.share}>{share(row.count, total)}</span>
          </li>
        ))}
      </ul>
      <SectionText muted>
        Running now also counts {runningComputers.builds} cloud computer builds.
      </SectionText>
    </Section>
  )
}
