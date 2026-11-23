import type { SchemaProps, Viewport } from '@mokly/mokly'
import { actionButton } from '../entries/components/common/actions.mockup'
import { ScreenLink } from '../components/common/ScreenLink'
import { LiftDialog } from '../components/operator/LiftDialog'
import type { QuestionTarget } from '../../../../src/ui/components/operator/operatorCopy'
import { OperatorPage } from '../components/operator/OperatorPage'
import { OrgDetails } from '../components/operator/OrgDetails'
import { SuspendDialog } from '../components/operator/SuspendDialog'
import {
  StopSwitchDialog,
  SwitchDialog,
} from '../components/operator/SwitchDialogs'
import {
  orgPages,
  suspendedDeletedOrg,
  type OrgPage,
} from '../fixtures/operatorPages'
import {
  configuredAccounts,
  switchStates,
  withSwitch,
} from '../fixtures/operatorSwitch'
import { paths } from '../paths'
import {
  accountQuestion,
  liftOf,
  stopLinks,
  switchLinks,
  switchWaitOf,
} from './operatorOrgLinks'

export const operatorOrgSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'switch', 'build', 'accounts', 'dialog'],
  properties: {
    /**
     * The org: in use, suspended by an operator, deleted by an admin, or
     * deleted by an admin and then suspended by an operator.
     */
    status: { enum: ['active', 'suspended', 'deleted', 'deleted-suspended'] },
    /**
     * The switch of the provider account of Hexwave from boat to e2b: none,
     * a switch that waits for the build of its admin, for Lift, or for an
     * admin who is not suspended, its build on e2b, a switch build that
     * failed, or Hexwave after the switch, with workspaces on both accounts.
     */
    switch: { enum: switchStates },
    /** A build of the org that its admin started runs now, or none. */
    build: { enum: ['none', 'running'] },
    /** The configured accounts: boat and e2b, or also e2b-us. */
    accounts: { enum: ['two', 'three'] },
    /**
     * The question over the page: before a suspension, a lift, a switch of
     * the account, or Stop switch.
     */
    dialog: { enum: ['none', 'suspend', 'lift', 'switch', 'stop'] },
  },
} as const

export type OperatorOrgState = SchemaProps<typeof operatorOrgSchema>

/** Hexwave in use on boat, with no switch, no build, and no question. */
export const hexwavePage: OperatorOrgState = {
  status: 'active',
  switch: 'none',
  build: 'none',
  accounts: 'two',
  dialog: 'none',
}

/** The pages of an org, and of its questions, in use and when deleted. */
const flows = {
  live: {
    page: paths.operatorOrg,
    suspend: paths.operatorOrgSuspend,
    suspended: paths.operatorOrgSuspended,
    lift: paths.operatorOrgLift,
  },
  deleted: {
    page: paths.operatorOrgDeleted,
    suspend: paths.operatorOrgDeletedSuspend,
    suspended: paths.operatorOrgDeletedSuspended,
    lift: paths.operatorOrgDeletedLift,
  },
} as const

type Flow = (typeof flows)[keyof typeof flows]

/**
 * The action of the header: Lift for a suspended org, and Suspend for an
 * org in use or deleted, as the operator protocol allows.
 */
function OrgAction(props: { org: OrgPage; flow: Flow }) {
  if (props.org.suspension !== undefined) {
    return (
      <ScreenLink asChild to={liftOf(props.org, props.flow).open}>
        <actionButton.Component
          icon="lock-open"
          moklyInstance="lift-suspension"
          tone="primary"
        >
          Lift suspension
        </actionButton.Component>
      </ScreenLink>
    )
  }
  return (
    <ScreenLink asChild to={props.flow.suspend}>
      <actionButton.Component
        icon="ban"
        moklyInstance="suspend-org"
        tone="danger"
      >
        Suspend org
      </actionButton.Component>
    </ScreenLink>
  )
}

/** The org of the page, in the state of its switch. */
function orgOf(state: OperatorOrgState): OrgPage {
  const page =
    state.status === 'deleted-suspended'
      ? suspendedDeletedOrg
      : orgPages[state.status]
  return withSwitch(page, state.switch, state.build === 'running')
}

/** The question over the page, or none. */
function OrgDialog(props: {
  state: OperatorOrgState
  org: OrgPage
  flow: Flow
  viewport: Viewport
}) {
  const { org, flow, viewport } = props
  const target: QuestionTarget = {
    kind: 'org',
    name: org.name,
    deletion: org.deleted ? { purge: org.deleted.purge } : null,
  }
  switch (props.state.dialog) {
    case 'none':
      return null
    case 'suspend':
      return (
        <SuspendDialog
          cancel={flow.page}
          done={flow.suspended}
          target={target}
          viewport={viewport}
        />
      )
    case 'lift': {
      const lift = liftOf(org, flow)
      return (
        <LiftDialog
          cancel={lift.links.cancel}
          done={lift.links.done}
          extra={lift.extra}
          target={target}
          viewport={viewport}
        />
      )
    }
    case 'switch': {
      const targets = configuredAccounts(props.state.accounts).filter(
        (id) => id !== org.account,
      )
      return (
        <SwitchDialog
          from={org.account}
          links={switchLinks(org)}
          org={org.name}
          targets={targets}
          to={targets[0] ?? org.account}
          viewport={viewport}
          wait={switchWaitOf(org)}
        />
      )
    }
    case 'stop':
      return org.switch ? (
        <StopSwitchDialog
          from={org.account}
          item={org.switch}
          links={stopLinks}
          org={org.name}
          viewport={viewport}
        />
      ) : null
  }
}

/**
 * The page of one org for the operator, from the Orgs tab: its state, its
 * details, its provider account with the switch of the account, its
 * workspaces, and its members, with Suspend or Lift. Switch account,
 * Stop switch, Suspend, and Lift each ask first. The questions of a
 * deleted org say what its deletion changes.
 */
export function OperatorOrgScreen(props: {
  state: OperatorOrgState
  viewport: Viewport
}) {
  const org = orgOf(props.state)
  const flow = org.deleted ? flows.deleted : flows.live
  return (
    <OperatorPage
      actions={<OrgAction flow={flow} org={org} />}
      back={{ label: 'Orgs', to: paths.operatorOrgs }}
      dialog={
        <OrgDialog
          flow={flow}
          org={org}
          state={props.state}
          viewport={props.viewport}
        />
      }
      subtitle="Org"
      tab="orgs"
      title={org.name}
      viewport={props.viewport}
    >
      <OrgDetails
        accountTo={accountQuestion(org, props.state.accounts)}
        org={org}
      />
    </OperatorPage>
  )
}
