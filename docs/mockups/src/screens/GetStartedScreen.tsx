import type { SchemaProps, Viewport } from '@mokly/mokly'
import { ArrowRight } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import { ScreenLink } from '../components/common/ScreenLink'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import type { RailState } from '../components/layout/OrgRail'
import { Page } from '../components/layout/Page'
import { people } from '../fixtures/members'
import { orgs } from '../fixtures/orgs'
import { type FirstBuildState, firstBuildStates } from '../fixtures/computer'
import { newOrg } from '../fixtures/repositories'
import { paths } from '../paths'
import { getStartedCopy as copy } from './getStartedCopy'
import {
  AgentStep,
  agentStates,
  getStartedPeople,
  getStartedSteps,
  InstallStep,
  isPast,
  OrgStep,
} from './getStartedSteps'
import styles from './GetStartedScreen.module.css'

export const getStartedSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['step', 'agent', 'person', 'firstBuild'],
  properties: {
    /**
     * The next of the first two steps: install the GitHub App, or create
     * an org. `done` follows both.
     */
    step: { enum: getStartedSteps },
    /**
     * Whether an agent is connected. A login belongs to the person, so it
     * stays after a leave of the last org.
     */
    agent: { enum: agentStates },
    /** The person signed in, with the GitHub App installation that they reach. */
    person: { enum: getStartedPeople },
    /**
     * The first build of the cloud computer of the org, which Create org
     * starts. The org step shows it once the org exists, and the finish
     * says that the org is ready only after it succeeded.
     */
    firstBuild: { enum: firstBuildStates },
  },
} as const

export type GetStartedState = SchemaProps<typeof getStartedSchema>

/**
 * Get started at the sign-up of Cal: the GitHub App is the next step, and
 * the first build runs once Create org has made the org.
 */
export const getStartedFirstRun: GetStartedState = {
  step: 'install',
  agent: 'none',
  person: 'cal',
  firstBuild: 'running',
}

/** The words of the finish in each state of the first build. */
const finishes: Readonly<Record<FirstBuildState, (org: string) => string>> = {
  running: copy.finishPreparing,
  succeeded: copy.finish,
  failed: copy.finishFailed,
  none: copy.finishNoBuild,
}

/**
 * The way into the org, once every step is done. The org opens also while
 * it has no good build, and the words then do not say that the org is
 * ready. After a failed build or with no build, the action of the org step
 * is the main action.
 */
function Finish(props: { build: FirstBuildState }) {
  const fix = props.build === 'failed' || props.build === 'none'
  return (
    <div className={styles.finish}>
      <p className={styles.finishText}>{finishes[props.build](newOrg.name)}</p>
      <ScreenLink asChild to={paths.newOrg}>
        <ActionButton icon={ArrowRight} tone={fix ? 'secondary' : 'primary'}>
          {copy.open(newOrg.name)}
        </ActionButton>
      </ScreenLink>
    </div>
  )
}

/**
 * The first run after the GitHub sign-in, and the page of a person with no
 * org. The person installs the GitHub App on the account that owns their
 * repositories, creates an org, and connects Claude or Codex. The rail shows
 * the org once it exists.
 */
export function GetStartedScreen(props: {
  state: GetStartedState
  viewport: Viewport
}) {
  const { step, agent, firstBuild } = props.state
  const person = people[props.state.person]
  const page = (
    <Page
      subtitle={`@${person.login}`}
      title={copy.title}
      viewport={props.viewport}
    >
      <p className={styles.intro}>{copy.intro(person.name)}</p>
      <ol className={styles.steps}>
        <li>
          <InstallStep person={props.state.person} step={step} />
        </li>
        <li>
          <OrgStep build={firstBuild} step={step} />
        </li>
        <li>
          <AgentStep agent={agent} build={firstBuild} step={step} />
        </li>
      </ol>
      {step === 'done' && agent === 'connected' ? (
        <Finish build={firstBuild} />
      ) : null}
    </Page>
  )
  if (props.viewport === 'mobile') return <MobileFrame>{page}</MobileFrame>
  const rail: RailState = {
    orgs: isPast(step, 'org') ? [orgs.firna] : [],
    current: undefined,
    firstRun: step === 'install',
    person,
  }
  return <AppFrame rail={rail}>{page}</AppFrame>
}
