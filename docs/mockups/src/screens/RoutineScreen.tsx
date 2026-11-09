import type { Viewport } from '@mokly/mokly'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { acmeRail } from '../components/layout/OrgRail'
import { Page } from '../components/layout/Page'
import { RunsPanel } from '../components/routines/RunsPanel'
import { offersRunNow } from '../components/routines/triggerCopy'
import {
  suspendedSections,
  workspaceSections,
} from '../components/workspaces/sections'
import { Sidebar } from '../components/workspaces/Sidebar'
import { memberViewer, people } from '../fixtures/members'
import { orgs, suspendedOrg } from '../fixtures/orgs'
import { editsOf } from '../fixtures/routineTriggers'
import { routines, type Routine } from '../fixtures/routines'
import { hasOlderRuns, runLists } from '../fixtures/runLists'
import { paths } from '../paths'
import { PhoneDelete, routineActions } from './routineActions'
import { PhoneSheet, RoutineForm, runLinks, titleOf } from './routineParts'
import { accessOf, saveStateOf, type RoutineState } from './routineState'
import { RoutineTabs } from './routineTabs'
import styles from './RoutineScreen.module.css'

/**
 * The screens that the actions of the flow "Create a routine" open: Save
 * of a new routine, and Run now of the saved routine before its first run.
 */
function flowLinks(state: RoutineState, routine: Routine) {
  return {
    saveTo: routine.saved ? undefined : paths.routineSaved,
    runNowTo:
      routine.key === 'morning-summary' && state.runs === 'none'
        ? paths.routineRunNow
        : undefined,
  }
}

/**
 * The page of a routine: its name, the Active switch, the repository, the
 * section of the run workspaces, the triggers, and the prompt with its
 * model, beside the Runs list. Desktop shows the runs in a column at the
 * right. A phone shows a saved routine in two tabs, Routine and Runs.
 * Every member sees the routine and its runs, and only its owner changes
 * it (decision 202). A suspended org shows them read-only to everyone.
 */
export function RoutineScreen(props: {
  state: RoutineState
  viewport: Viewport
}) {
  const { state, viewport } = props
  const mobile = viewport === 'mobile'
  const suspended = state.org === 'suspended'
  const routine = routines[state.routine]
  const access = accessOf(state, routine)
  const edits = editsOf(state.triggers, routine.triggers)
  const menu = state.triggers === 'menu'
  // A new routine has no runs yet, so a phone shows it without tabs.
  const runsTab = mobile && routine.saved && state.tab === 'runs'
  const form = (
    <RoutineForm
      access={access}
      edits={edits}
      menu={menu}
      routine={routine}
      suspended={suspended}
      viewport={viewport}
    />
  )
  const runs = (
    <RunsPanel
      links={suspended ? {} : runLinks}
      older={hasOlderRuns(state.runs)}
      ownerViews={access === 'owner'}
      routine={routine}
      runs={runLists[state.runs]}
      viewport={viewport}
    />
  )
  const page = (
    <Page
      actions={routineActions({
        routine,
        access,
        save: saveStateOf(state, routine),
        viewport,
        withForm: !runsTab,
        runNow: offersRunNow(edits.map((edit) => edit.trigger)),
        ...flowLinks(state, routine),
      })}
      back={{
        label: 'Routines',
        to: suspended ? paths.suspendedRoutines : paths.routines,
      }}
      fill
      subtitle="Routine"
      tabs={
        mobile && routine.saved ? (
          <RoutineTabs
            routine={routine}
            suspended={suspended}
            tab={state.tab}
          />
        ) : undefined
      }
      title={titleOf(routine)}
      viewport={viewport}
    >
      {mobile ? (
        <div className={styles.phoneScroll}>
          <div className={styles.phoneContent}>
            {runsTab ? runs : form}
            {!runsTab && access === 'owner' && routine.saved ? (
              <PhoneDelete />
            ) : null}
          </div>
        </div>
      ) : (
        <div className={styles.body}>
          <div className={styles.formScroll}>
            <div className={styles.form}>{form}</div>
          </div>
          {runs}
        </div>
      )}
    </Page>
  )
  if (mobile) {
    return (
      <MobileFrame>
        {page}
        <PhoneSheet edits={edits} menu={menu} />
      </MobileFrame>
    )
  }
  return (
    <AppFrame
      rail={{
        ...acmeRail,
        suspended: suspended ? suspendedOrg : undefined,
        person: state.viewer === 'member' ? people[memberViewer] : undefined,
      }}
      sidebar={
        <Sidebar
          current="routines"
          org={orgs.acme}
          sections={suspended ? suspendedSections() : workspaceSections()}
          suspended={suspended}
        />
      }
    >
      {page}
    </AppFrame>
  )
}
