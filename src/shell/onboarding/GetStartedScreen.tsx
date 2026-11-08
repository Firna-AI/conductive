import { ArrowRight } from 'lucide-react'
import styles from '../../../docs/mockups/src/screens/GetStartedScreen.module.css'
import { nextStep, stepState } from '../../app/get-started'
import { personName } from '../../app/people'
import { routes } from '../../app/router'
import { useStore } from '../../app/store'
import type { User } from '../../shared/api'
import type { GetStartedResponse } from '../../shared/onboarding'
import type { OrgSummary } from '../../shared/orgs'
import { useApp } from '../context'
import { Page } from '../layout/Page'
import { ActionButton } from '../ui/actions'
import { useGo } from '../ui/AppLink'
import { AgentStep } from './AgentStep'
import { InstallStep } from './InstallStep'
import { OrgStep } from './OrgStep'

/** The way into the first org, once every step is done. */
function Finish(props: { org: OrgSummary }) {
  const go = useGo()
  return (
    <div className={styles.finish}>
      <p className={styles.finishText}>
        {props.org.name} is ready for its first workspace.
      </p>
      <ActionButton
        icon={ArrowRight}
        onPress={() => go(routes.org(props.org.id))}
        tone="primary"
      >
        {`Open ${props.org.name}`}
      </ActionButton>
    </div>
  )
}

/**
 * The three steps in their fixed order. Only the next step has its action
 * or its open form. A done step shows its result.
 */
function Steps(props: { response: GetStartedResponse }) {
  const app = useApp()
  const orgs = useStore(app.orgs)
  const { response } = props
  const org = orgs.find((item) => item.id === response.orgId) ?? null
  return (
    <>
      <ol className={styles.steps}>
        <li>
          <InstallStep state={stepState(response, 'github-app')} />
        </li>
        <li>
          <OrgStep org={org} state={stepState(response, 'org')} />
        </li>
        <li>
          <AgentStep state={stepState(response, 'agent-login')} />
        </li>
      </ol>
      {nextStep(response) === 'done' && org ? <Finish org={org} /> : null}
    </>
  )
}

/**
 * The only first run, after the GitHub sign-in: the user installs the
 * GitHub App, creates the first org, and connects Claude or Codex. The step
 * of the GitHub App comes from the API, and each done step loads it again.
 * The org step and the agent step follow the org list and the account.
 */
export function GetStartedScreen(props: { user: User }) {
  const app = useApp()
  const response = useStore(app.getStarted)
  return (
    <Page subtitle={`@${props.user.githubLogin}`} title="Get started">
      <p className={styles.intro}>
        Welcome, {personName(props.user)}. Three steps before your first
        workspace.
      </p>
      {response ? <Steps response={response} /> : null}
    </Page>
  )
}
