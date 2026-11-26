import type { Viewport } from '@mokly/mokly'
import { emptyState } from '../entries/components/common/EmptyState.mockup'
import { loadFailure } from '../entries/components/common/LoadFailure.mockup'
import { ScreenLink } from '../components/common/ScreenLink'
import { actionButton } from '../entries/components/common/actions.mockup'
import { page } from '../entries/components/layout/Page.mockup'
import { suspendedOrgNotice } from '../entries/components/orgs/SuspendedOrgNotice.mockup'
import { orgs, suspendedOrg } from '../fixtures/orgs'
import { paths } from '../paths'
import type { AutomationState } from './automationState'
import styles from '../../../../src/ui/screens/AutomationScreen.module.css'

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
      <loadFailure.Component
        moklyInstance="automation-load-failure"
        title="The automation didn't load"
        to={props.pages.automation}
      />
    )
  }
  return (
    <emptyState.Component
      action={
        <ScreenLink asChild to={props.pages.automations}>
          <actionButton.Component
            moklyInstance="open-automations"
            tone="primary"
          >
            Open Automations
          </actionButton.Component>
        </ScreenLink>
      }
      icon="search-x"
      moklyInstance="automation-not-available"
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
      {props.suspended ? (
        <suspendedOrgNotice.Component
          moklyInstance="suspended-org-notice"
          org={{ name: orgs[suspendedOrg].name }}
        />
      ) : null}
      <Content pages={pages} read={props.read} />
    </>
  )
  return (
    <page.Component
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
    </page.Component>
  )
}
