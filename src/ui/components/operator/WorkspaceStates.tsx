import type { ActivityStatus } from '../workspaces/activityStatus'
import type { StateCounts, WorkspaceStateKey } from '../settings/statCounts'
import { Section, SectionText } from '../settings/Section'
import { StatusGlyph } from '../workspaces/StatusGlyph'
import styles from './WorkspaceStates.module.css'

/**
 * The name of each state, and the glyph that the header draws for it. A
 * removed workspace stays archived, so its header draws the same glyph.
 */
const states: Readonly<
  Record<WorkspaceStateKey, { label: string; glyph: ActivityStatus }>
> = {
  running: { label: 'Running', glyph: 'ready' },
  stopped: { label: 'Stopped', glyph: 'stopped' },
  failed: { label: 'Failed', glyph: 'error' },
  archived: { label: 'Archived', glyph: 'archived' },
  removed: { label: 'Removed', glyph: 'archived' },
}

const order: readonly WorkspaceStateKey[] = [
  'running',
  'stopped',
  'failed',
  'archived',
  'removed',
]

/** A share as a whole percent, or with one decimal below 1%. */
function share(count: number, total: number): string {
  if (count === 0) return '0%'
  const percent = (count / total) * 100
  return percent < 1 ? `${percent.toFixed(1)}%` : `${Math.round(percent)}%`
}

/**
 * The line under the list that names the builds that run now. Running now,
 * the tile of the overview, counts them too. The page of an org has no
 * such tile.
 */
function buildsLine(builds: number, page: 'overview' | 'org'): string {
  const named = `${builds.toLocaleString('en')} cloud computer ${builds === 1 ? 'build' : 'builds'}`
  return page === 'overview'
    ? `Running now also counts ${named}.`
    : `${named} also ${builds === 1 ? 'runs' : 'run'} now.`
}

/**
 * The workspaces of every org, of one org, or of one person, in each
 * state, with the glyph of the state of the cloud computer that the header
 * draws, so that a state never depends on colour alone. Removed comes after
 * Archived, apart from it. A line under the list names the running builds,
 * when the page counts builds. It imports no fixture value, so the app uses
 * it too.
 */
export function WorkspaceStates(props: {
  counts: StateCounts
  /**
   * The builds that run now, and the page that counts them: the overview
   * of every org, or the page of one org. The Stats tab of the account
   * counts no builds.
   */
  builds?: { count: number; page: 'overview' | 'org' }
}) {
  const total = order.reduce((sum, key) => sum + props.counts[key], 0)
  return (
    <Section title="Workspaces">
      <ul aria-label="Workspaces by state" className={styles.list}>
        {order.map((key) => (
          <li className={styles.row} key={key}>
            <StatusGlyph status={states[key].glyph} />
            <span className={styles.label}>{states[key].label}</span>
            <span className={styles.count}>
              {props.counts[key].toLocaleString('en')}
            </span>
            <span className={styles.share}>
              {share(props.counts[key], total)}
            </span>
          </li>
        ))}
      </ul>
      {props.builds && props.builds.count > 0 ? (
        <SectionText muted>
          {buildsLine(props.builds.count, props.builds.page)}
        </SectionText>
      ) : null}
    </Section>
  )
}
