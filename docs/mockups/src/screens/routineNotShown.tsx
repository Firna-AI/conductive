import type { Viewport } from '@mokly/mokly'
import { SearchX } from 'lucide-react'
import { EmptyState } from '../components/common/EmptyState'
import { LoadFailure } from '../components/common/LoadFailure'
import { ScreenLink } from '../components/common/ScreenLink'
import { ActionButton } from '../components/common/actions'
import { Page } from '../components/layout/Page'
import { SuspendedOrgNotice } from '../components/orgs/SuspendedOrgNotice'
import { orgs, suspendedOrg } from '../fixtures/orgs'
import { paths } from '../paths'
import type { RoutineState } from './routineState'
import styles from './RoutineScreen.module.css'

/** A read of a saved routine that shows no routine. */
type NotShown = Exclude<RoutineState['read'], 'ready'>

/** The pages of the routine and of the list of the routines of the org. */
type Pages = { routine: string; routines: string }

/**
 * What the page shows: the routine is not available, with the way to the
 * list of the routines, or the load failure of the other pages of the app,
 * whose Try again reads the routine again.
 */
function Content(props: { read: NotShown; pages: Pages }) {
  if (props.read === 'failed') {
    return (
      <LoadFailure title="The routine didn't load" to={props.pages.routine} />
    )
  }
  return (
    <EmptyState
      action={
        <ScreenLink asChild to={props.pages.routines}>
          <ActionButton tone="primary">Open Routines</ActionButton>
        </ScreenLink>
      }
      icon={SearchX}
      title="This routine is not available"
    />
  )
}

/**
 * The routine page when it cannot show its routine: the org no longer has
 * it, because it was deleted or the address is wrong, or its read failed.
 * The page keeps Routine as its title, with no subtitle, and the way back
 * to Routines, and it has no tabs, no Runs list, and no actions. A
 * suspended org keeps its notice above the content, and its links stay in
 * the suspended org.
 */
export function RoutineNotShown(props: {
  read: NotShown
  suspended: boolean
  viewport: Viewport
}) {
  const pages: Pages = props.suspended
    ? { routine: paths.suspendedRoutine, routines: paths.suspendedRoutines }
    : { routine: paths.routine, routines: paths.routines }
  const content = (
    <>
      {props.suspended ? <SuspendedOrgNotice org={orgs[suspendedOrg]} /> : null}
      <Content pages={pages} read={props.read} />
    </>
  )
  return (
    <Page
      back={{ label: 'Routines', to: pages.routines }}
      fill
      title="Routine"
      viewport={props.viewport}
    >
      {props.viewport === 'mobile' ? (
        <div className={styles.phoneScroll}>
          <div className={styles.phoneContent}>{content}</div>
        </div>
      ) : (
        <div className={styles.body}>
          <div className={styles.formScroll}>
            <div className={styles.form}>{content}</div>
          </div>
        </div>
      )}
    </Page>
  )
}
