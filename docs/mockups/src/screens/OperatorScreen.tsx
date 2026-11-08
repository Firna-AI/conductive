import type { SchemaProps, Viewport } from '@mokly/mokly'
import { RefreshCw } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import type { RailState } from '../components/layout/OrgRail'
import { Page } from '../components/layout/Page'
import { LargestOrgs } from '../components/operator/LargestOrgs'
import { LiftDialog } from '../components/operator/LiftDialog'
import { DailyChart } from '../components/operator/DailyChart'
import { OperatorTiles } from '../components/operator/OperatorTiles'
import {
  OperatorError,
  OperatorLoading,
} from '../components/operator/OperatorStates'
import { Suspensions } from '../components/operator/Suspensions'
import { WorkspaceStates } from '../components/operator/WorkspaceStates'
import {
  newUsersByDay,
  newWorkspacesByDay,
  operatorUpdatedAt,
} from '../fixtures/operator'
import { orgList } from '../fixtures/orgs'
import { paths } from '../paths'

export const operatorSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['numbers', 'suspended', 'dialog'],
  properties: {
    /**
     * The numbers of the page: shown, loading when the page opens, or
     * failed to load.
     */
    numbers: { enum: ['ready', 'loading', 'error'] },
    /** The users and orgs that are suspended now: some, or none. */
    suspended: { enum: ['some', 'none'] },
    /** The question before the lift of a user or of an org. */
    dialog: { enum: ['none', 'lift-user', 'lift-org'] },
  },
} as const

export type OperatorState = SchemaProps<typeof operatorSchema>

/** The rail of an operator, with the operator page open. */
const operatorRail: RailState = {
  orgs: orgList,
  current: 'operator',
  operator: true,
}

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
          <Suspensions empty={props.state.suspended === 'none'} />
          <WorkspaceStates />
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

/** The question before a lift, over the page. */
function dialogOf(state: OperatorState, viewport: Viewport) {
  switch (state.dialog) {
    case 'none':
      return null
    case 'lift-user':
      return <LiftDialog kind="user" viewport={viewport} />
    case 'lift-org':
      return <LiftDialog kind="org" viewport={viewport} />
  }
}

/**
 * The page of the operator, the person who runs the app for everyone: the
 * numbers of every org at the moment the page opened, and the users and
 * orgs that are suspended, with Lift. Only an operator reaches it, from the
 * rail on desktop and the org switcher on a phone. It shows counts and
 * names only, never the content of an org.
 */
export function OperatorScreen(props: {
  state: OperatorState
  viewport: Viewport
}) {
  const mobile = props.viewport === 'mobile'
  const ready = props.state.numbers === 'ready'
  // A phone reads the numbers again when the page opens, so only the
  // desktop header has Refresh.
  const refresh =
    ready && !mobile ? (
      <ActionButton icon={RefreshCw}>Refresh</ActionButton>
    ) : undefined
  const page = (
    <Page
      actions={refresh}
      back={mobile ? { label: 'Workspaces', to: paths.shell } : undefined}
      subtitle={ready ? `Updated at ${operatorUpdatedAt}` : undefined}
      title="Operator"
      viewport={props.viewport}
    >
      <OperatorBody state={props.state} viewport={props.viewport} />
    </Page>
  )
  const dialog = dialogOf(props.state, props.viewport)
  if (mobile) {
    return (
      <MobileFrame>
        {page}
        {dialog}
      </MobileFrame>
    )
  }
  return (
    <AppFrame overlay={dialog} rail={operatorRail}>
      {page}
    </AppFrame>
  )
}
