import type { SchemaProps, Viewport } from '@mokly/mokly'
import { ArrowRight } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import { ScreenLink } from '../components/common/ScreenLink'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import type { RailState } from '../components/layout/OrgRail'
import { Page } from '../components/layout/Page'
import { account, orgs } from '../fixtures/orgs'
import { newOrg } from '../fixtures/repositories'
import { paths } from '../paths'
import {
  AgentStep,
  getStartedSteps,
  InstallStep,
  isPast,
  KeyStep,
  OrgStep,
} from './getStartedSteps'
import styles from './GetStartedScreen.module.css'

export const getStartedSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['step'],
  properties: {
    /**
     * The step that comes next: install the GitHub App, create the first
     * org, add its Boat key, or connect an agent. `done` follows the last.
     */
    step: { enum: getStartedSteps },
  },
} as const

export type GetStartedState = SchemaProps<typeof getStartedSchema>

/** The way into the first org, once every step is done. */
function Finish() {
  return (
    <div className={styles.finish}>
      <p className={styles.finishText}>
        {newOrg.name} is ready for its first workspace.
      </p>
      <ScreenLink asChild to={paths.newOrg}>
        <ActionButton icon={ArrowRight} tone="primary">
          {`Open ${newOrg.name}`}
        </ActionButton>
      </ScreenLink>
    </div>
  )
}

/**
 * The only first run, after the GitHub sign-in: the user installs the
 * GitHub App on the account that owns their repositories, creates the
 * first org, adds its Boat key, and connects Claude or Codex. The rail
 * shows the org once it exists.
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
        Welcome, {account.name}. Four steps before your first workspace.
      </p>
      <ol className={styles.steps}>
        <li>
          <InstallStep step={step} />
        </li>
        <li>
          <OrgStep step={step} />
        </li>
        <li>
          <KeyStep step={step} />
        </li>
        <li>
          <AgentStep step={step} />
        </li>
      </ol>
      {step === 'done' ? <Finish /> : null}
    </Page>
  )
  if (props.viewport === 'mobile') return <MobileFrame>{page}</MobileFrame>
  const rail: RailState = {
    orgs: isPast(step, 'org') ? [orgs.firna] : [],
    current: undefined,
    firstRun: step === 'install',
  }
  return <AppFrame rail={rail}>{page}</AppFrame>
}
