import { actionButton } from '../entries/components/common/actions.mockup'
import { ScreenLink } from '../components/common/ScreenLink'
import { statusText } from '../entries/components/common/StatusText.mockup'
import { agentList } from '../entries/components/settings/AccountSections.mockup'
import type { OpenAgentForm } from '../components/settings/AccountSections'
import {
  section,
  sectionText,
} from '../entries/components/settings/Section.mockup'
import { defaultChoice } from '../fixtures/agents'
import type { FirstBuildState } from '../fixtures/computer'
import type { AgentLogins } from '../fixtures/logins'
import type { PersonKey } from '../fixtures/members'
import {
  firstInstallation,
  type installations,
  memberInstallation,
} from '../fixtures/orgs'
import { newOrg } from '../fixtures/repositories'
import { paths } from '../paths'
import { orgBuildActions } from './getStartedBuild'
import { orgBuild } from '../entries/components/screens/getStartedBuild.mockup'
import { defined } from '../defined'
import { getStartedCopy as copy } from './getStartedCopy'
import styles from './GetStartedScreen.module.css'

/**
 * The GitHub App step and the org step in their order, then `done` after
 * both. The agent step has its own state, because a login belongs to the
 * person and not to an org.
 */
export const getStartedSteps = ['install', 'org', 'done'] as const

export type GetStartedStep = (typeof getStartedSteps)[number]

/** Whether the person has connected an agent. */
export const agentStates = ['none', 'connected'] as const

export type AgentState = (typeof agentStates)[number]

/**
 * The people whom Get started draws: Cal, who signs up, and Priya, a member
 * who left Acme, the last org.
 */
export const getStartedPeople = [
  'cal',
  'priya',
] as const satisfies readonly PersonKey[]

export type GetStartedPerson = (typeof getStartedPeople)[number]

/** The installation of the GitHub App that each person reaches. */
const installationOf: Readonly<
  Record<GetStartedPerson, (typeof installations)[number]>
> = {
  cal: firstInstallation,
  priya: memberInstallation,
}

/** Whether Get started is past a step, which then shows as done. */
export function isPast(step: GetStartedStep, target: GetStartedStep): boolean {
  return getStartedSteps.indexOf(step) > getStartedSteps.indexOf(target)
}

/** The state of a step that is done. `name` names it for Mokly. */
const done = (label: string, name: string) => (
  <statusText.Component label={label} moklyInstance={name} tone="success" />
)

export function InstallStep(props: {
  step: GetStartedStep
  person: GetStartedPerson
}) {
  const { install } = copy
  if (!isPast(props.step, 'install')) {
    return (
      <section.Component
        actions={
          <ScreenLink asChild to={paths.getStartedInstalled}>
            <actionButton.Component
              icon="arrow-up-right"
              moklyInstance="install-github-app"
              tone="primary"
            >
              {install.action}
            </actionButton.Component>
          </ScreenLink>
        }
        description={install.description}
        moklyInstance="install"
        title={install.title}
      />
    )
  }
  const installation = installationOf[props.person]
  return (
    <section.Component
      actions={
        <actionButton.Component icon="plus" moklyInstance="install-another">
          {install.another}
        </actionButton.Component>
      }
      moklyInstance="install"
      status={done(install.done, 'install-done')}
      title={install.title}
    >
      <sectionText.Component moklyInstance="installed-on">
        Installed on{' '}
        <span className={styles.strong}>{installation.account}</span>, with{' '}
        {installation.repositories} repositories.
      </sectionText.Component>
    </section.Component>
  )
}

/**
 * Create an org. Once the org exists, the step shows its first build, which
 * Create org started, with Try again after a failure.
 */
export function OrgStep(props: {
  step: GetStartedStep
  build: FirstBuildState
}) {
  const { org } = copy
  if (isPast(props.step, 'org')) {
    const used = newOrg.repositories.filter((item) => item.used).length
    return (
      <section.Component
        moklyInstance="org"
        status={done(org.done, 'org-done')}
        title={org.title}
        {...defined({ actions: orgBuildActions(props.build) })}
      >
        <sectionText.Component moklyInstance="org-repositories">
          <span className={styles.strong}>{newOrg.name}</span>, with {used}{' '}
          repositories.
        </sectionText.Component>
        <orgBuild.Component build={props.build} moklyInstance="org-build" />
      </section.Component>
    )
  }
  const next = props.step === 'org'
  const create = (
    <actionButton.Component
      disabled={!next}
      icon="plus"
      moklyInstance="create-org"
      tone={next ? 'primary' : 'secondary'}
    >
      {org.action}
    </actionButton.Component>
  )
  return (
    <section.Component
      actions={
        next ? (
          <ScreenLink asChild to={paths.createFirstOrg}>
            {create}
          </ScreenLink>
        ) : (
          create
        )
      }
      description={org.description}
      moklyInstance="org"
      title={org.title}
    />
  )
}

/** The page after Connect, which shows the first build in its state. */
const connectedPaths: Readonly<Record<FirstBuildState, string>> = {
  running: paths.getStartedPreparing,
  succeeded: paths.getStartedConnected,
  failed: paths.getStartedBuildFailed,
  none: paths.getStartedNoBuild,
}

/**
 * Connect Claude or Codex. A connected agent is Claude with a subscription
 * token, and it can come before the org. The default model is Claude's, so
 * the form of Claude opens when the step is next.
 */
export function AgentStep(props: {
  step: GetStartedStep
  agent: AgentState
  build: FirstBuildState
}) {
  const connected = props.agent === 'connected'
  const logins: AgentLogins = connected ? { claude: { kind: 'token' } } : {}
  const form: OpenAgentForm | undefined =
    !connected && props.step === 'done'
      ? {
          agent: defaultChoice.agent,
          connectTo: connectedPaths[props.build],
          cancel: false,
        }
      : undefined
  return (
    <section.Component
      description={copy.agent.description}
      moklyInstance="agent"
      title={copy.agent.title}
      {...defined({
        status: connected ? done(copy.agent.done, 'agent-done') : undefined,
      })}
    >
      <agentList.Component
        logins={logins}
        moklyInstance="agent-list"
        {...defined({ form })}
      />
    </section.Component>
  )
}
