import type { SchemaProps, Viewport } from '@mokly/mokly'
import { actionButton } from '../entries/components/common/actions.mockup'
import { DailyChart } from '../../../../src/ui/components/operator/DailyChart'
import { LargestOrgs } from '../components/operator/LargestOrgs'
import { LongRuns } from '../components/operator/LongRuns'
import { OperatorPage } from '../components/operator/OperatorPage'
import {
  OperatorError,
  OperatorLoading,
} from '../components/operator/OperatorStates'
import { OperatorTiles } from '../components/operator/OperatorTiles'
import { WorkspaceStates } from '../../../../src/ui/components/operator/WorkspaceStates'
import {
  newUsersByDay,
  newWorkspacesByDay,
  operatorUpdatedAt,
} from '../fixtures/operator'
import { overviewRuns } from '../fixtures/operatorRuns'

export const operatorSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['numbers', 'signUps', 'waitlist'],
  properties: {
    /**
     * The numbers of the page: shown, loading when the page opens, or
     * failed to load.
     */
    numbers: { enum: ['ready', 'loading', 'error'] },
    /**
     * The workspaces whose cloud computers run when the page reads its
     * numbers. `many` is the usual case, and it applies when the prop is
     * absent. `few` has 3 runs, and the newest has no cloud computer ID
     * yet. `none` has no run.
     */
    runs: { enum: ['many', 'few', 'none'] },
    /** Sign-ups are open, or an operator paused them. */
    signUps: { enum: ['open', 'paused'] },
    /** The waitlist is on, or an operator turned it off. */
    waitlist: { enum: ['on', 'off'] },
  },
} as const

export type OperatorState = SchemaProps<typeof operatorSchema>

function OperatorBody(props: { state: OperatorState; viewport: Viewport }) {
  switch (props.state.numbers) {
    case 'loading':
      return <OperatorLoading viewport={props.viewport} />
    case 'error':
      return <OperatorError />
    case 'ready': {
      const runs = overviewRuns[props.state.runs ?? 'many']
      return (
        <>
          <OperatorTiles running={runs.running} />
          <WorkspaceStates
            builds={{ count: runs.running.builds, page: 'overview' }}
            counts={runs.states}
          />
          <LongRuns runs={runs.longRuns} viewport={props.viewport} />
          <DailyChart
            days={newWorkspacesByDay}
            narrow={props.viewport === 'mobile'}
            title="New workspaces"
          />
          <DailyChart
            days={newUsersByDay}
            narrow={props.viewport === 'mobile'}
            title="New users"
          />
          <LargestOrgs orgs={runs.largestOrgs} viewport={props.viewport} />
        </>
      )
    }
  }
}

/**
 * The Overview tab of the operator, the person who runs the app for
 * everyone: the numbers of every org at the moment the page opened, and
 * the longest runs of cloud computers. Only an operator reaches it, from
 * the rail on desktop and the org switcher on a phone. It shows counts,
 * names, IDs, and states only, never the content of an org.
 */
export function OperatorScreen(props: {
  state: OperatorState
  viewport: Viewport
}) {
  const ready = props.state.numbers === 'ready'
  // A phone reads the numbers again when the page opens, so only the
  // desktop header has Refresh.
  const refresh =
    ready && props.viewport === 'desktop' ? (
      <actionButton.Component icon="refresh-cw" moklyInstance="refresh">
        Refresh
      </actionButton.Component>
    ) : undefined
  return (
    <OperatorPage
      actions={refresh}
      signUps={props.state.signUps}
      subtitle={ready ? `Updated at ${operatorUpdatedAt}` : undefined}
      tab="overview"
      title="Operator"
      viewport={props.viewport}
      waitlist={props.state.waitlist}
    >
      <OperatorBody state={props.state} viewport={props.viewport} />
    </OperatorPage>
  )
}
