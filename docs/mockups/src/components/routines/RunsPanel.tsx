import type { Viewport } from '@mokly/mokly'
import { History } from 'lucide-react'
import type { Run } from '../../fixtures/routineRuns'
import type { Routine } from '../../fixtures/routines'
import { EmptyState } from '../common/EmptyState'
import { RunList } from './RunList'
import styles from './RunsPanel.module.css'

/** The runs that the panel shows, and what the list needs to draw them. */
export type RunsPanelProps = {
  runs: readonly Run[]
  routine: Routine
  /** The person signed in created the routine. */
  ownerViews: boolean
  /** The screens of the run workspaces that the mockups draw, by run. */
  links: Readonly<Record<string, string>>
  viewport: Viewport
}

/** A routine without runs: each run will show here with its workspace. */
function NoRuns() {
  return (
    <EmptyState
      body="Each run opens a new workspace and shows here."
      icon={History}
      title="No runs yet"
    />
  )
}

/**
 * The runs of a routine: a column at the right of the page on desktop, and
 * a part below the form on a phone. Each run shows its time, its trigger,
 * its state, and a link to its workspace.
 */
export function RunsPanel(props: RunsPanelProps) {
  const empty = props.runs.length === 0
  const list = (
    <RunList
      boxed={props.viewport === 'mobile'}
      links={props.links}
      ownerViews={props.ownerViews}
      routine={props.routine}
      runs={props.runs}
    />
  )
  if (props.viewport === 'mobile') {
    return (
      <section aria-labelledby="runs-heading" className={styles.section}>
        <h2 className={styles.heading} id="runs-heading">
          Runs
        </h2>
        {empty ? (
          <div className={styles.emptyBox}>
            <NoRuns />
          </div>
        ) : (
          list
        )}
      </section>
    )
  }
  return (
    <aside aria-labelledby="runs-heading" className={styles.column}>
      <h2 className={styles.bar} id="runs-heading">
        Runs
      </h2>
      <div className={styles.scroll}>{empty ? <NoRuns /> : list}</div>
    </aside>
  )
}
