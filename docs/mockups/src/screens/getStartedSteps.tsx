import { ArrowUpRight, Plus } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import { ScreenLink } from '../components/common/ScreenLink'
import { StatusText } from '../components/common/StatusText'
import {
  AgentList,
  type OpenAgentForm,
} from '../components/settings/AccountSections'
import { Section, SectionText } from '../components/settings/Section'
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
import { OrgBuild, orgBuildActions } from './getStartedBuild'
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

const done = (label: string) => <StatusText label={label} tone="success" />

export function InstallStep(props: {
  step: GetStartedStep
  person: GetStartedPerson
}) {
  const { install } = copy
  if (!isPast(props.step, 'install')) {
    return (
      <Section
        actions={
          <ScreenLink asChild to={paths.getStartedInstalled}>
            <ActionButton icon={ArrowUpRight} tone="primary">
              {install.action}
            </ActionButton>
          </ScreenLink>
        }
        description={install.description}
        title={install.title}
      />
    )
  }
  const installation = installationOf[props.person]
  return (
    <Section
      actions={<ActionButton icon={Plus}>{install.another}</ActionButton>}
      status={done(install.done)}
      title={install.title}
    >
      <SectionText>
        Installed on{' '}
        <span className={styles.strong}>{installation.account}</span>, with{' '}
        {installation.repositories} repositories.
      </SectionText>
    </Section>
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
      <Section
        actions={orgBuildActions(props.build)}
        status={done(org.done)}
        title={org.title}
      >
        <SectionText>
          <span className={styles.strong}>{newOrg.name}</span>, with {used}{' '}
          repositories.
        </SectionText>
        <OrgBuild build={props.build} />
      </Section>
    )
  }
  const next = props.step === 'org'
  const create = (
    <ActionButton
      disabled={!next}
      icon={Plus}
      tone={next ? 'primary' : 'secondary'}
    >
      {org.action}
    </ActionButton>
  )
  return (
    <Section
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
    <Section
      description={copy.agent.description}
      status={connected ? done(copy.agent.done) : undefined}
      title={copy.agent.title}
    >
      <AgentList form={form} logins={logins} />
    </Section>
  )
}
