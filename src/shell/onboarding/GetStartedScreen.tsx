import { ArrowRight } from 'lucide-react'
import { getStartedCopy as copy } from '../../../docs/mockups/src/screens/getStartedCopy'
import styles from '../../../docs/mockups/src/screens/GetStartedScreen.module.css'
import { useFirstBuild, type FirstBuild } from '../../app/first-build'
import { nextStep, stepState } from '../../app/get-started'
import { personName } from '../../app/people'
import { routes } from '../../app/router'
import { useStore, valueOf } from '../../app/store'
import type { User } from '../../shared/api'
import type { GetStartedResponse } from '../../shared/onboarding'
import type { OrgSummary } from '../../shared/orgs'
import { DeletedOrgsSection } from '../account/DeletedOrgsSection'
import { useApp, useOrgModel } from '../context'
import { Page } from '../layout/Page'
import { ActionButton } from '../ui/actions'
import { useGo } from '../ui/AppLink'
import { AgentStep } from './AgentStep'
import { InstallStep } from './InstallStep'
import { OrgStep } from './OrgStep'

/** The words of the finish in each state of the first build of the org. */
const finishes: Readonly<Record<FirstBuild['state'], (org: string) => string>> =
  {
    running: copy.finishPreparing,
    succeeded: copy.finish,
    failed: copy.finishFailed,
    none: copy.finishNoBuild,
  }

/**
 * The way into the org of Get started, once every step is done. The org
 * opens also while it has no good build, and the words say that it is
 * ready only after a build succeeded. They wait for the builds. After a
 * failed build or with no build, the action of the org step is the main
 * action, so Open is a secondary button.
 */
function Finish(props: { org: OrgSummary }) {
  const go = useGo()
  const first = valueOf(useFirstBuild(useOrgModel(props.org.id)))
  const fix = first?.state === 'failed' || first?.state === 'none'
  return (
    <div className={styles.finish}>
      <p className={styles.finishText}>
        {first ? finishes[first.state](props.org.name) : null}
      </p>
      <ActionButton
        icon={ArrowRight}
        onPress={() => go(routes.org(props.org.id))}
        tone={fix ? 'secondary' : 'primary'}
      >
        {copy.open(props.org.name)}
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
 * The first run after the GitHub sign-in, and the page of a person with no
 * org: the user installs the GitHub App, creates an org, and connects
 * Claude or Codex. The step of the GitHub App comes from the API, and each
 * done step loads it again. The org step and the agent step follow the org
 * list and the account. The org step and the finish also show the first
 * build of the org, from its builds. The words are the mockup's, from one
 * copy module. While the user has a deleted org, Deleted orgs comes before
 * the steps, because a phone has no other way from here to the Account
 * page. Restore there opens the org.
 */
export function GetStartedScreen(props: { user: User }) {
  const app = useApp()
  const go = useGo()
  const response = useStore(app.getStarted)
  return (
    <Page subtitle={`@${props.user.githubLogin}`} title={copy.title}>
      <p className={styles.intro}>{copy.intro(personName(props.user))}</p>
      <DeletedOrgsSection onRestored={(org) => go(routes.org(org.id))} />
      {response ? <Steps response={response} /> : null}
    </Page>
  )
}
