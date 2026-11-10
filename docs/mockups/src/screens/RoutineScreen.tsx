import type { Viewport } from '@mokly/mokly'
import { Page } from '../components/layout/Page'
import { SuspendedOrgNotice } from '../components/orgs/SuspendedOrgNotice'
import { DeleteRoutineDialog } from '../components/routines/DeleteRoutineDialog'
import { RunsPanel } from '../components/routines/RunsPanel'
import { offersRunNow } from '../components/routines/triggerCopy'
import { orgs, suspendedOrg } from '../fixtures/orgs'
import { editsOf } from '../fixtures/routineTriggers'
import { routines, type Routine } from '../fixtures/routines'
import { hasOlderRuns, runLists } from '../fixtures/runLists'
import { paths } from '../paths'
import { PhoneDelete, routineActions } from './routineActions'
import { RoutineFrame } from './routineFrame'
import { RoutineNotShown } from './routineNotShown'
import { PhoneSheet, RoutineForm, runLinks, titleOf } from './routineParts'
import {
  accessOf,
  saveStateOf,
  viewerOf,
  type RoutineState,
} from './routineState'
import { RoutineTabs } from './routineTabs'
import styles from './RoutineScreen.module.css'

/**
 * The screens that the actions open: Save of a new routine and Run now of
 * the saved routine before its first run, as in the flow "Create a
 * routine", and the question of Delete of the routine that reviews pull
 * requests.
 */
function flowLinks(state: RoutineState, routine: Routine) {
  return {
    saveTo: routine.saved ? undefined : paths.routineSaved,
    runNowTo:
      routine.key === 'morning-summary' && state.runs === 'none'
        ? paths.routineRunNow
        : undefined,
    deleteTo: routine.key === 'review-prs' ? paths.routineDelete : undefined,
  }
}

/**
 * The page of a routine: its name, the Active switch, the repository, the
 * section of the run workspaces, the triggers, and the prompt with its
 * model, beside the Runs list. Desktop shows the runs in a column at the
 * right. A phone shows a saved routine in two tabs, Routine and Runs.
 * Every member sees the routine and its runs, and only its owner changes
 * it (decision 502). A suspended org shows them read-only to everyone,
 * under its notice: at the top of the form on desktop, and above either tab
 * on a phone. A routine that the page cannot read shows why in place of the
 * routine.
 */
export function RoutineScreen(props: {
  state: RoutineState
  viewport: Viewport
}) {
  const { state, viewport } = props
  const mobile = viewport === 'mobile'
  const suspended = state.org === 'suspended'
  if (state.read !== 'ready') {
    return (
      <RoutineFrame state={state} viewport={viewport}>
        <RoutineNotShown
          read={state.read}
          suspended={suspended}
          viewport={viewport}
        />
      </RoutineFrame>
    )
  }
  const routine = routines[state.routine]
  const access = accessOf(state, routine)
  const edits = editsOf(state.triggers, routine.triggers)
  const menu = state.triggers === 'menu'
  // A new routine has no runs yet, so a phone shows it without tabs.
  const runsTab = mobile && routine.saved && state.tab === 'runs'
  const links = flowLinks(state, routine)
  const dialog =
    state.dialog === 'delete' && !suspended ? (
      <DeleteRoutineDialog routine={routine} viewport={viewport} />
    ) : null
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
  const notice = suspended ? (
    <SuspendedOrgNotice org={orgs[suspendedOrg]} />
  ) : null
  const runs = (
    <RunsPanel
      links={suspended ? {} : runLinks}
      older={hasOlderRuns(state.runs)}
      routine={routine}
      runs={runLists[state.runs]}
      // A suspended org takes every action away, so no failed run offers one.
      viewer={suspended ? undefined : viewerOf(state)}
      viewport={viewport}
    />
  )
  return (
    <RoutineFrame
      overlay={
        mobile ? (
          <>
            <PhoneSheet edits={edits} menu={menu} />
            {dialog}
          </>
        ) : (
          dialog
        )
      }
      state={state}
      viewport={viewport}
    >
      <Page
        actions={routineActions({
          routine,
          access,
          save: saveStateOf(state, routine),
          viewport,
          withForm: !runsTab,
          runNow: offersRunNow(edits.map((edit) => edit.trigger)),
          ...links,
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
              {notice}
              {runsTab ? runs : form}
              {!runsTab && access === 'owner' && routine.saved ? (
                <PhoneDelete to={links.deleteTo} />
              ) : null}
            </div>
          </div>
        ) : (
          <div className={styles.body}>
            <div className={styles.formScroll}>
              <div className={styles.form}>
                {notice}
                {form}
              </div>
            </div>
            {runs}
          </div>
        )}
      </Page>
    </RoutineFrame>
  )
}
