import type { SchemaProps, Viewport } from '@mokly/mokly'
import { ArrowUpRight, Plus } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import { ScreenLink } from '../components/common/ScreenLink'
import { StatusText } from '../components/common/StatusText'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import type { RailState } from '../components/layout/OrgRail'
import { Page } from '../components/layout/Page'
import { AgentList } from '../components/settings/AccountSections'
import { Section, SectionText } from '../components/settings/Section'
import { defaultChoice, type AgentKey } from '../fixtures/agents'
import { account, installations } from '../fixtures/orgs'
import { paths } from '../paths'
import styles from './GetStartedScreen.module.css'

export const getStartedSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['step'],
  properties: {
    /**
     * The step that comes next: install the GitHub App, connect an agent,
     * or create the first org.
     */
    step: { enum: ['install', 'connect', 'create'] },
  },
} as const

export type GetStartedState = SchemaProps<typeof getStartedSchema>

type Step = GetStartedState['step']

/** The account that owns the repositories, where the user installed the app. */
const owner = installations[0]

function InstallStep(props: { step: Step }) {
  if (props.step === 'install') {
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
        title="1. Install the GitHub App"
      />
    )
  }
  return (
    <Section
      actions={<ActionButton icon={Plus}>Add another account</ActionButton>}
      status={<StatusText label="Installed" tone="success" />}
      title="1. Install the GitHub App"
    >
      <SectionText>
        Installed on <span className={styles.owner}>{owner.account}</span>, with{' '}
        {owner.repositories} repositories.
      </SectionText>
    </Section>
  )
}

/**
 * Connect Claude or Codex, from decision 33, drawn as its recommended
 * option D. The default model is Claude's, so Claude leads while the step
 * is next.
 */
function AgentStep(props: { step: Step }) {
  const next = props.step === 'connect'
  const connected: readonly AgentKey[] =
    props.step === 'create' ? [defaultChoice.agent] : []
  const connect = (agent: AgentKey) => {
    const lead = next && agent === defaultChoice.agent
    const button = (
      <ActionButton tone={lead ? 'primary' : 'secondary'}>Connect</ActionButton>
    )
    if (!lead) return button
    return (
      <ScreenLink asChild to={paths.getStartedConnected}>
        {button}
      </ScreenLink>
    )
  }
  return (
    <Section
      description="Your agents run on your own Claude or OpenAI account. Connect at least one now, and the other at any time in your account."
      status={
        connected.length > 0 ? (
          <StatusText label="Connected" tone="success" />
        ) : undefined
      }
      title="2. Connect Claude or Codex"
    >
      <AgentList connect={connect} connected={connected} />
    </Section>
  )
}

function OrgStep(props: { step: Step }) {
  const ready = props.step !== 'install'
  const create = (
    <ActionButton
      disabled={!ready}
      icon={Plus}
      tone={props.step === 'create' ? 'primary' : 'secondary'}
    >
      Create org
    </ActionButton>
  )
  return (
    <Section
      actions={
        ready ? (
          <ScreenLink asChild to={paths.createFirstOrg}>
            {create}
          </ScreenLink>
        ) : (
          create
        )
      }
      description="An org holds your workspaces, the repositories that they use, and their cloud computer."
      title="3. Create your first org"
    />
  )
}

/**
 * The only first run, after the GitHub sign-in: the user installs the
 * GitHub App on the account that owns their repositories, connects Claude
 * or Codex, and creates the first org. The rail has no org yet.
 */
export function GetStartedScreen(props: {
  state: GetStartedState
  viewport: Viewport
}) {
  const { step } = props.state
  const page = (
    <Page
      subtitle={`@${account.login}`}
      title="Get started"
      viewport={props.viewport}
    >
      <p className={styles.intro}>
        Welcome, {account.name}. Three steps before your first workspace.
      </p>
      <ol className={styles.steps}>
        <li>
          <InstallStep step={step} />
        </li>
        <li>
          <AgentStep step={step} />
        </li>
        <li>
          <OrgStep step={step} />
        </li>
      </ol>
    </Page>
  )
  if (props.viewport === 'mobile') return <MobileFrame>{page}</MobileFrame>
  const rail: RailState = {
    orgs: [],
    current: undefined,
    firstRun: step === 'install',
  }
  return <AppFrame rail={rail}>{page}</AppFrame>
}
