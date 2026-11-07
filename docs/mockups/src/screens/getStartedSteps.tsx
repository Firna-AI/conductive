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
import type { AgentLogins } from '../fixtures/logins'
import { firstInstallation } from '../fixtures/orgs'
import { newOrg } from '../fixtures/repositories'
import { paths } from '../paths'
import styles from './GetStartedScreen.module.css'

/** The steps of Get started in their order, then `done` after the last. */
export const getStartedSteps = ['install', 'org', 'agent', 'done'] as const

export type GetStartedStep = (typeof getStartedSteps)[number]

/** Whether the first run is past a step, which then shows as done. */
export function isPast(step: GetStartedStep, target: GetStartedStep): boolean {
  return getStartedSteps.indexOf(step) > getStartedSteps.indexOf(target)
}

const done = (label: string) => <StatusText label={label} tone="success" />

export function InstallStep(props: { step: GetStartedStep }) {
  const title = '1. Install the GitHub App'
  if (!isPast(props.step, 'install')) {
    return (
      <Section
        actions={
          <ScreenLink asChild to={paths.getStartedInstalled}>
            <ActionButton icon={ArrowUpRight} tone="primary">
              Install the GitHub App
            </ActionButton>
          </ScreenLink>
        }
        description="Install it on the GitHub account that owns your repositories, such as the organization of your company. You choose the repositories that it can reach."
        title={title}
      />
    )
  }
  return (
    <Section
      actions={<ActionButton icon={Plus}>Add another account</ActionButton>}
      status={done('Installed')}
      title={title}
    >
      <SectionText>
        Installed on{' '}
        <span className={styles.strong}>{firstInstallation.account}</span>, with{' '}
        {firstInstallation.repositories} repositories.
      </SectionText>
    </Section>
  )
}

export function OrgStep(props: { step: GetStartedStep }) {
  const title = '2. Create your first org'
  if (isPast(props.step, 'org')) {
    const used = newOrg.repositories.filter((item) => item.used).length
    return (
      <Section status={done('Created')} title={title}>
        <SectionText>
          <span className={styles.strong}>{newOrg.name}</span>, with {used}{' '}
          repositories.
        </SectionText>
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
      Create org
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
      description="An org holds your workspaces, the repositories that they use, and their cloud computer."
      title={title}
    />
  )
}

/**
 * Connect Claude or Codex, from decision 33 D. The default model is
 * Claude's, so the form of Claude opens when the step is next, and Claude
 * is connected with a subscription token when the step is done.
 */
export function AgentStep(props: { step: GetStartedStep }) {
  const finished = props.step === 'done'
  const logins: AgentLogins = finished ? { claude: 'token' } : {}
  const form: OpenAgentForm | undefined =
    props.step === 'agent'
      ? {
          agent: defaultChoice.agent,
          connectTo: paths.getStartedConnected,
          cancel: false,
        }
      : undefined
  return (
    <Section
      description="Your agents run on your own Claude or OpenAI account. Connect at least one now, and the other at any time in your account."
      status={finished ? done('Connected') : undefined}
      title="3. Connect Claude or Codex"
    >
      <AgentList form={form} logins={logins} />
    </Section>
  )
}
