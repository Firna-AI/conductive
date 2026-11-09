import { LinkTabs } from '../components/common/LinkTabs'
import type { Routine } from '../fixtures/routines'
import { paths } from '../paths'
import type { RoutineState } from './routineState'

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
    ? { routine: paths.suspendedRoutine }
    : (tabPages[props.routine.key] ?? {})
  return (
    <LinkTabs
      label="Routine"
      tabs={[
        {
          label: 'Routine',
          to: pages.routine,
          selected: props.tab === 'routine',
        },
        { label: 'Runs', to: pages.runs, selected: props.tab === 'runs' },
      ]}
    />
  )
}
