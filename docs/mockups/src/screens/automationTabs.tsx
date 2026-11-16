import { LinkTabs } from '../components/common/LinkTabs'
import type { Automation } from '../fixtures/automations'
import { paths } from '../paths'
import type { AutomationState } from './automationState'

/** The pages of the two tabs of an automation, where the mockups draw them. */
type TabPages = { automation?: string; runs?: string }

const tabPages: Readonly<Partial<Record<string, TabPages>>> = {
  'review-prs': { automation: paths.automation, runs: paths.automationRuns },
  'morning-summary': {
    automation: paths.automationSaved,
    runs: paths.automationRunNow,
  },
  'dependency-updates': { automation: paths.automationAdmin },
  'copy-review': { automation: paths.automationOwnerLeft },
  'error-triage': { automation: paths.automationTurnedOff },
  'refund-tests': { automation: paths.automationRepositoryRemoved },
  'refund-tests-again': { automation: paths.automationRepositoryChosen },
}

/**
 * The two tabs of a saved automation on a phone: Automation, with the form, and
 * Runs, with the Runs list. Each tab links to its page, when the mockups
 * draw one.
 */
export function AutomationTabs(props: {
  automation: Automation
  tab: AutomationState['tab']
  suspended: boolean
}) {
  const pages: TabPages = props.suspended
    ? {
        automation: paths.suspendedAutomation,
        runs: paths.suspendedAutomationRuns,
      }
    : (tabPages[props.automation.key] ?? {})
  return (
    <LinkTabs
      label="Automation"
      tabs={[
        {
          label: 'Automation',
          to: pages.automation,
          selected: props.tab === 'automation',
        },
        { label: 'Runs', to: pages.runs, selected: props.tab === 'runs' },
      ]}
    />
  )
}
