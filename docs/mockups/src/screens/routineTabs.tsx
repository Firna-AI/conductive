import { linkTabs } from '../entries/components/common/LinkTabs.mockup'
import type { Routine } from '../fixtures/routines'
import { paths } from '../paths'
import type { RoutineState } from './routineState'
import { defined } from '../defined'

/** The pages of the two tabs of a routine, where the mockups draw them. */
type TabPages = { routine?: string; runs?: string }

const tabPages: Readonly<Partial<Record<string, TabPages>>> = {
  'review-prs': { routine: paths.routine, runs: paths.routineRuns },
  'morning-summary': {
    routine: paths.routineSaved,
    runs: paths.routineRunNow,
  },
  'dependency-updates': { routine: paths.routineAdmin },
  'copy-review': { routine: paths.routineOwnerLeft },
  'error-triage': { routine: paths.routineTurnedOff },
  'refund-tests': { routine: paths.routineRepositoryRemoved },
  'refund-tests-again': { routine: paths.routineRepositoryChosen },
}

/**
 * The two tabs of a saved routine on a phone: Routine, with the form, and
 * Runs, with the Runs list. Each tab links to its page, when the mockups
 * draw one.
 */
export function RoutineTabs(props: {
  routine: Routine
  tab: RoutineState['tab']
  suspended: boolean
}) {
  const pages: TabPages = props.suspended
    ? { routine: paths.suspendedRoutine, runs: paths.suspendedRoutineRuns }
    : (tabPages[props.routine.key] ?? {})
  return (
    <linkTabs.Component
      label="Routine"
      moklyInstance="routine-tabs"
      tabs={[
        {
          label: 'Routine',
          selected: props.tab === 'routine',
          ...defined({ to: pages.routine }),
        },
        {
          label: 'Runs',
          selected: props.tab === 'runs',
          ...defined({ to: pages.runs }),
        },
      ]}
    />
  )
}
