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
  required: ['numbers'],
  properties: {
    /**
     * The numbers of the page: shown, loading when the page opens, or
     * failed to load.
     */
    numbers: { enum: ['ready', 'loading', 'error'] },
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
          />
          <DailyChart
            rows={newWorkspacesByDay}
            title="New workspaces"
            viewport={props.viewport}
          />
          <DailyChart
            rows={newUsersByDay}
            title="New users"
            viewport={props.viewport}
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
      subtitle={ready ? `Updated at ${operatorUpdatedAt}` : undefined}
      tab="overview"
      title="Operator"
      viewport={props.viewport}
    >
      <OperatorBody state={props.state} viewport={props.viewport} />
    </OperatorPage>
  )
}
