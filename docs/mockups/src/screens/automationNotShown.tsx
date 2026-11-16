import type { Viewport } from '@mokly/mokly'
import { SearchX } from 'lucide-react'
import { EmptyState } from '../components/common/EmptyState'
import { LoadFailure } from '../components/common/LoadFailure'
import { ScreenLink } from '../components/common/ScreenLink'
import { ActionButton } from '../components/common/actions'
import { Page } from '../components/layout/Page'
import { SuspendedOrgNotice } from '../components/orgs/SuspendedOrgNotice'
import { orgs, suspendedOrg } from '../fixtures/orgs'
import { paths } from '../paths'
import type { AutomationState } from './automationState'
import styles from './AutomationScreen.module.css'

/** A read of a saved automation that shows no automation. */
type NotShown = Exclude<AutomationState['read'], 'ready'>

/** The pages of the automation and of the list of the automations of the org. */
type Pages = { automation: string; automations: string }

/**
 * What the page shows: the automation is not available, with the way to the
 * list of the automations, or the load failure of the other pages of the app,
 * whose Try again reads the automation again.
 */
function Content(props: { read: NotShown; pages: Pages }) {
  if (props.read === 'failed') {
    return (
      <LoadFailure
        title="The automation didn't load"
        to={props.pages.automation}
      />
    )
  }
  return (
    <EmptyState
      action={
        <ScreenLink asChild to={props.pages.automations}>
          <ActionButton tone="primary">Open Automations</ActionButton>
        </ScreenLink>
      }
      icon={SearchX}
      title="This automation is not available"
    />
  )
}

/**
 * The automation page when it cannot show its automation: the org no longer has
 * it, because it was deleted or the address is wrong, or its read failed.
 * The page keeps Automation as its title, with no subtitle, and the way back
 * to Automations, and it has no tabs, no Runs list, and no actions. A
 * suspended org keeps its notice above the content, and its links stay in
 * the suspended org.
 */
export function AutomationNotShown(props: {
  read: NotShown
  suspended: boolean
  viewport: Viewport
}) {
  const pages: Pages = props.suspended
    ? {
        automation: paths.suspendedAutomation,
        automations: paths.suspendedAutomations,
      }
    : { automation: paths.automation, automations: paths.automations }
  const content = (
    <>
      {props.suspended ? <SuspendedOrgNotice org={orgs[suspendedOrg]} /> : null}
      <Content pages={pages} read={props.read} />
    </>
  )
  return (
    <Page
      back={{ label: 'Automations', to: pages.automations }}
      fill
      title="Automation"
      viewport={props.viewport}
    >
      {props.viewport === 'mobile' ? (
        <div className={styles.phoneScroll}>
          <div className={styles.phoneContent}>{content}</div>
        </div>
      ) : (
        <div className={styles.body}>
          <div className={styles.formScroll}>
            <div className={styles.form}>{content}</div>
          </div>
        </div>
      )}
    </Page>
  )
}
