import type { SchemaProps, Viewport } from '@mokly/mokly'
import { RefreshCw } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import { DailyChart } from '../components/operator/DailyChart'
import { LargestOrgs } from '../components/operator/LargestOrgs'
import { OperatorPage } from '../components/operator/OperatorPage'
import {
  OperatorError,
  OperatorLoading,
} from '../components/operator/OperatorStates'
import { OperatorTiles } from '../components/operator/OperatorTiles'
import { WorkspaceStates } from '../components/operator/WorkspaceStates'
import {
  newUsersByDay,
  newWorkspacesByDay,
  operatorUpdatedAt,
  runningComputers,
  workspaceStates,
} from '../fixtures/operator'

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
    case 'ready':
      return (
        <>
          <OperatorTiles />
          <WorkspaceStates
            builds={runningComputers.builds}
            counts={workspaceStates}
            page="overview"
          />
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
          <LargestOrgs viewport={props.viewport} />
        </>
      )
  }
}

/**
 * The Overview tab of the operator, the person who runs the app for
 * everyone: the numbers of every org at the moment the page opened. Only
 * an operator reaches it, from the rail on desktop and the org switcher on
 * a phone. It shows counts and names only, never the content of an org.
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
      <ActionButton icon={RefreshCw}>Refresh</ActionButton>
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
