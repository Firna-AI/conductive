import type { SchemaProps, Viewport } from '@mokly/mokly'
import { actionButton } from '../entries/components/common/actions.mockup'
import { ScreenLink } from '../components/common/ScreenLink'
import {
  appFrame,
  mobileFrame,
} from '../entries/components/layout/AppFrame.mockup'
import type { RailState } from '../components/layout/OrgRail'
import { page as pagePart } from '../entries/components/layout/Page.mockup'
import { deletedOrgsSection } from '../entries/components/settings/DeletedOrgsSection.mockup'
import { people } from '../fixtures/members'
import { orgs } from '../fixtures/orgs'
import { type FirstBuildState, firstBuildStates } from '../fixtures/computer'
import { paths } from '../paths'
import { getStartedCopy as copy } from '../../../../src/ui/screens/getStartedCopy'
import {
  agentStates,
  getStartedPeople,
  getStartedSteps,
  isPast,
  setupOrgOf,
  type GetStartedPerson,
} from './getStartedSteps'
import {
  agentStep,
  installStep,
  orgStep,
} from '../entries/components/screens/getStartedSteps.mockup'
import styles from '../../../../src/ui/screens/GetStartedScreen.module.css'

export const getStartedSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['step', 'agent', 'person', 'firstBuild', 'deletedOrgs'],
  properties: {
    /**
     * The next of the first two steps: install the GitHub App, or create
     * an org. `done` follows both.
     */
    step: { enum: getStartedSteps },
    /**
     * Whether an agent is connected. A personal login belongs to the
     * person, so it stays after a leave of the last org. `org` has no login
     * of the person, and the org login of their org for Claude, so the step
     * is done (decision 4 of the org logins plan).
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
    /**
     * The orgs of the person that an admin deleted: none, so the page shows
     * no Deleted orgs list, or Acme Labs, which the person can restore.
     */
    deletedOrgs: { enum: ['none', 'restorable'] },
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
  deletedOrgs: 'none',
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
function Finish(props: { build: FirstBuildState; person: GetStartedPerson }) {
  const fix = props.build === 'failed' || props.build === 'none'
  const org = setupOrgOf[props.person]
  return (
    <div className={styles.finish}>
      <p className={styles.finishText}>{finishes[props.build](org.name)}</p>
      <ScreenLink asChild to={org.list}>
        <actionButton.Component
          icon="arrow-right"
          moklyInstance="open-org"
          tone={fix ? 'secondary' : 'primary'}
        >
          {copy.open(org.name)}
        </actionButton.Component>
      </ScreenLink>
    </div>
  )
}

/**
 * The first run after the GitHub sign-in, and the page of a person with no
 * org. The person installs the GitHub App on the account that owns their
 * repositories, creates an org, and connects Claude or Codex. The rail shows
 * the org once it exists. While the person has a deleted org, the Deleted
 * orgs list with Restore comes before the steps, because a phone has no
 * other way from this page to Settings.
 */
export function GetStartedScreen(props: {
  state: GetStartedState
  viewport: Viewport
}) {
  const { step } = props.state
  const person = people[props.state.person]
  const page = <GetStartedPage state={props.state} viewport={props.viewport} />
  if (props.viewport === 'mobile')
    return <mobileFrame.Component>{page}</mobileFrame.Component>
  const setupOrg = orgs[setupOrgOf[props.state.person].key]
  const rail: RailState = {
    orgs: isPast(step, 'org') ? [setupOrg] : [],
    firstRun: step === 'install',
    person,
  }
  return <appFrame.Component rail={rail}>{page}</appFrame.Component>
}

/**
 * The page of Get started, without its frame, such as the page below
 * Settings in the first run.
 */
export function GetStartedPage(props: {
  state: GetStartedState
  viewport: Viewport
}) {
  const { step, agent, firstBuild } = props.state
  const person = people[props.state.person]
  return (
    <pagePart.Component
      subtitle={`@${person.login}`}
      title={copy.title}
      viewport={props.viewport}
    >
      <p className={styles.intro}>{copy.intro(person.name)}</p>
      <deletedOrgsSection.Component
        moklyInstance="deleted-orgs"
        restoredTo={paths.shell}
        state={props.state.deletedOrgs}
      />
      <ol className={styles.steps}>
        <li>
          <installStep.Component
            moklyInstance="install-step"
            person={props.state.person}
            step={step}
          />
        </li>
        <li>
          <orgStep.Component
            build={firstBuild}
            moklyInstance="org-step"
            person={props.state.person}
            step={step}
          />
        </li>
        <li>
          <agentStep.Component
            agent={agent}
            build={firstBuild}
            moklyInstance="agent-step"
            person={props.state.person}
            step={step}
          />
        </li>
      </ol>
      {step === 'done' && agent !== 'none' ? (
        <Finish build={firstBuild} person={props.state.person} />
      ) : null}
    </pagePart.Component>
  )
}
