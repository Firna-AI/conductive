import type { Viewport } from '@mokly/mokly'
import { History } from 'lucide-react'
import type { PersonKey } from '../../fixtures/members'
import type { Run } from '../../fixtures/routineRuns'
import type { Routine } from '../../fixtures/routines'
import { ActionButton } from '../common/actions'
import { EmptyState } from '../common/EmptyState'
import { RunList } from './RunList'
import styles from './RunsPanel.module.css'

/** The runs that the panel shows, and what the list needs to draw them. */
export type RunsPanelProps = {
  runs: readonly Run[]
  /** Runs older than the newest 50 exist, so the end of the list offers them. */
  older: boolean
  routine: Routine
  /**
   * The person signed in, who reads the causes of their own failed runs as
   * their owner. None where nobody can act, as in a suspended org.
   */
  viewer?: PersonKey
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

/** The runs, newest first, with Show older runs at the end when they exist. */
function Runs(props: RunsPanelProps) {
  const mobile = props.viewport === 'mobile'
  return (
    <>
      <RunList
        boxed={mobile}
        links={props.links}
        routine={props.routine}
        runs={props.runs}
        viewer={props.viewer}
      />
      {props.older ? (
        <div className={mobile ? styles.olderPhone : styles.older}>
          <ActionButton>Show older runs</ActionButton>
        </div>
      ) : null}
    </>
  )
}

/**
 * The runs of a routine: a column at the right of the page on desktop, and
 * the Runs tab on a phone. Each run shows its time, its trigger, its
 * state, and a link to its workspace. The list holds the newest 50 runs.
 */
export function RunsPanel(props: RunsPanelProps) {
  const empty = props.runs.length === 0
  if (props.viewport === 'mobile') {
    return (
      <section aria-label="Runs" className={styles.section}>
        {empty ? (
          <div className={styles.emptyBox}>
            <NoRuns />
          </div>
        ) : (
          <Runs {...props} />
        )}
      </section>
    )
  }
  return (
    <aside aria-labelledby="runs-heading" className={styles.column}>
      <h2 className={styles.bar} id="runs-heading">
        Runs
      </h2>
      <div className={styles.scroll}>
        {empty ? <NoRuns /> : <Runs {...props} />}
      </div>
    </aside>
  )
}
