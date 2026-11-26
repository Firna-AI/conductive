import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import type { PersonKey } from '../../fixtures/members'
import type { Run } from '../../fixtures/automationRuns'
import type { Automation } from '../../fixtures/automations'
import { actionButton } from '../../entries/components/common/actions.mockup'
import { emptyState } from '../../entries/components/common/EmptyState.mockup'
import { RunList } from './RunList'
import styles from '../../../../../src/ui/components/automations/RunsPanel.module.css'

/** The runs that the panel shows, and what the list needs to draw them. */
export type RunsPanelProps = {
  runs: readonly Run[]
  /** Runs older than the newest 50 exist, so the end of the list offers them. */
  older: boolean
  automation: Automation
  /**
   * The person signed in, who reads the causes of their own failed runs as
   * their owner. None where nobody can act, as in a suspended org.
   */
  viewer?: PersonKey
  /** The screens of the run workspaces that the mockups draw, by run. */
  links: Readonly<Record<string, string>>
  viewport: Viewport
}

/** An automation without runs: each run will show here with its workspace. */
function NoRuns() {
  return (
    <emptyState.Component
      body="Each run opens a new workspace and shows here."
      icon="history"
      moklyInstance="runs-empty"
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
        automation={props.automation}
        runs={props.runs}
        viewer={props.viewer}
      />
      {props.older ? (
        <div className={mobile ? styles.olderPhone : styles.older}>
          <actionButton.Component moklyInstance="show-older-runs">
            Show older runs
          </actionButton.Component>
        </div>
      ) : null}
    </>
  )
}

/**
 * The runs of an automation: a column at the right of the page on desktop, and
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
