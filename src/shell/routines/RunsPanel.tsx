import { useId, type ReactNode } from 'react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { History } from 'lucide-react'
import { EmptyState } from '../../../docs/mockups/src/components/common/EmptyState'
import styles from '../../../docs/mockups/src/components/routines/RunsPanel.module.css'
import type { ShownRuns } from '../../app/routine-runs'
import type { Loadable } from '../../app/store'
import { useNow } from '../../app/time'
import type { Routine } from '../../shared/routines'
import { ActionButton } from '../ui/actions'
import { LoadFailure } from '../ui/LoadFailure'
import ui from '../ui/ui.module.css'
import { useAction } from '../ui/useAction'
import { useViewport } from '../ui/viewport'
import { RunList } from './RunList'

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

/** The saved routine of the runs, and what the list needs to draw them. */
export interface RunsSource {
  routine: Routine
  runs: Loadable<ShownRuns>
  loadOlder: () => Promise<void>
  retry: () => Promise<void>
}

function Content(props: {
  source: RunsSource | null
  ownerViews: boolean
  orgName: string
  phone: boolean
}) {
  const theme = useSharedUiTheme()
  const now = useNow(30_000)
  const older = useAction(
    () => props.source?.loadOlder() ?? Promise.resolve(),
    'The older runs did not load',
  )
  const { source, phone } = props
  const runs = source?.runs
  if (
    !source ||
    !runs ||
    (runs.state === 'ready' && runs.value.runs.length === 0)
  ) {
    return phone ? (
      <div className={styles.emptyBox}>
        <NoRuns />
      </div>
    ) : (
      <NoRuns />
    )
  }
  if (runs.state === 'loading') {
    return (
      <div className={ui.center}>
        <Spinner
          accessibilityLabel="Loading the runs"
          color={theme.colors.muted}
          size={13}
        />
      </div>
    )
  }
  if (runs.state === 'failed') {
    return (
      <LoadFailure
        error={runs.error}
        retry={source.retry}
        title="The runs didn't load"
      />
    )
  }
  return (
    <>
      <RunList
        boxed={phone}
        now={now}
        orgName={props.orgName}
        ownerViews={props.ownerViews}
        routine={source.routine}
        runs={runs.value.runs}
      />
      {runs.value.more ? (
        <div className={phone ? styles.olderPhone : styles.older}>
          <ActionButton busy={older.pending} onPress={() => older.run()}>
            Show older runs
          </ActionButton>
        </div>
      ) : null}
    </>
  )
}

/**
 * The runs of a routine: a column at the right of the page on desktop, and
 * the Runs tab on a phone. A new routine has no runs yet. The list holds
 * the newest 50 runs, and Show older runs adds the next older ones.
 */
export function RunsPanel(props: {
  /** The runs of a saved routine, or null for a new routine. */
  source: RunsSource | null
  ownerViews: boolean
  orgName: string
}): ReactNode {
  const heading = useId()
  const phone = useViewport() === 'phone'
  const content = (
    <Content
      orgName={props.orgName}
      ownerViews={props.ownerViews}
      phone={phone}
      source={props.source}
    />
  )
  if (phone) {
    return (
      <section aria-label="Runs" className={styles.section}>
        {content}
      </section>
    )
  }
  return (
    <aside aria-labelledby={heading} className={styles.column}>
      <h2 className={styles.bar} id={heading}>
        Runs
      </h2>
      <div className={styles.scroll}>{content}</div>
    </aside>
  )
}
