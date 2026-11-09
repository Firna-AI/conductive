import type { Viewport } from '@mokly/mokly'
import { classes } from '../components/common/classes'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { acmeRail } from '../components/layout/OrgRail'
import { Page } from '../components/layout/Page'
import { RunsPanel } from '../components/routines/RunsPanel'
import { workspaceSections } from '../components/workspaces/sections'
import { Sidebar } from '../components/workspaces/Sidebar'
import { memberViewer, people } from '../fixtures/members'
import { orgs } from '../fixtures/orgs'
import { runLists } from '../fixtures/routineRuns'
import { editsOf } from '../fixtures/routineTriggers'
import { routines, type Routine } from '../fixtures/routines'
import { paths } from '../paths'
import { PhoneDelete, routineActions } from './routineActions'
import { PhoneSheet, RoutineForm, runLinks, titleOf } from './routineParts'
import { accessOf, saveStateOf, type RoutineState } from './routineState'
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
 * right, and a phone below the form. Every member sees the routine and its
 * runs, and only its owner changes it (decision 202).
 */
export function RoutineScreen(props: {
  state: RoutineState
  viewport: Viewport
}) {
  const { state, viewport } = props
  const mobile = viewport === 'mobile'
  const routine = routines[state.routine]
  const access = accessOf(state, routine)
  const edits = editsOf(state.triggers, routine.triggers)
  const menu = state.triggers === 'menu'
  const form = (
    <RoutineForm
      access={access}
      edits={edits}
      menu={menu}
      routine={routine}
      viewport={viewport}
    />
  )
  const runs = (
    <RunsPanel
      links={runLinks}
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
        ...flowLinks(state, routine),
      })}
      back={{ label: 'Routines', to: paths.routines }}
      fill
      subtitle="Routine"
      title={titleOf(routine)}
      viewport={viewport}
    >
      {mobile ? (
        <div
          className={classes(
            styles.phoneScroll,
            state.focus === 'runs' && styles.atEnd,
          )}
        >
          <div className={styles.phoneContent}>
            {form}
            {access === 'owner' && routine.saved ? <PhoneDelete /> : null}
            {runs}
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
        person: state.viewer === 'member' ? people[memberViewer] : undefined,
      }}
      sidebar={
        <Sidebar
          current="routines"
          org={orgs.acme}
          sections={workspaceSections()}
        />
      }
    >
      {page}
    </AppFrame>
  )
}
