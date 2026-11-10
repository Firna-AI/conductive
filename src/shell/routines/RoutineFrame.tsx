import type { ReactNode } from 'react'
import styles from '../../../docs/mockups/src/screens/RoutineScreen.module.css'
import { routes, type RoutineTab } from '../../app/router'
import type { OrgSummary } from '../../shared/orgs'
import { Page } from '../layout/Page'
import { LinkTabs } from '../ui/links'
import { useViewport } from '../ui/viewport'

/** The tab of a saved routine that a phone shows: its form, or its runs. */
export interface RoutineTabs {
  routineId: string
  current: RoutineTab
}

/**
 * The frame of the routine page: Routines as the way back, the name, and
 * the actions, over the form. A desktop centres the form, with the Runs
 * list in a column at the right. A phone shows a saved routine in two tabs,
 * Routine and Runs, and a new routine without tabs, because it has no runs
 * yet.
 */
export function RoutineFrame(props: {
  org: OrgSummary
  /**
   * The name of the routine, or New routine, over the subtitle Routine. A
   * page that shows no routine, such as while it loads or when the org no
   * longer has it, has none, and its title is Routine alone.
   */
  title?: string
  actions?: ReactNode
  /** The Runs list: a column on desktop, and the Runs tab on a phone. */
  runs?: ReactNode
  /** The tabs of a saved routine on a phone. */
  tabs?: RoutineTabs
  children: ReactNode
}) {
  const { org, tabs } = props
  const phone = useViewport() === 'phone'
  const runsTab = phone && tabs?.current === 'runs'
  return (
    <Page
      actions={props.actions}
      back={{ label: 'Routines', to: routes.routines(org.id) }}
      backOnDesktop
      fill
      subtitle={props.title === undefined ? undefined : 'Routine'}
      tabs={
        phone && tabs ? (
          <LinkTabs
            label="Routine"
            tabs={[
              {
                label: 'Routine',
                to: routes.routine(org.id, tabs.routineId),
                selected: tabs.current === 'routine',
              },
              {
                label: 'Runs',
                to: routes.routine(org.id, tabs.routineId, 'runs'),
                selected: tabs.current === 'runs',
              },
            ]}
          />
        ) : undefined
      }
      title={props.title ?? 'Routine'}
    >
      {phone ? (
        <div className={styles.phoneScroll}>
          <div className={styles.phoneContent}>
            {runsTab ? props.runs : props.children}
          </div>
        </div>
      ) : (
        <div className={styles.body}>
          <div className={styles.formScroll}>
            <div className={styles.form}>{props.children}</div>
          </div>
          {props.runs}
        </div>
      )}
    </Page>
  )
}
