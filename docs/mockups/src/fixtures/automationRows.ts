/**
 * The automations of Acme as its Automations page lists them, with the state of
 * the last run of each.
 */

import { defaultChoice } from './agents'
import { stateAfterSuspension } from './automationRuns'
import { type RunState } from '../../../../src/ui/components/workspaces/activityStatus'
import { automations, london, type Automation } from './automations'
import { people } from './members'

/** An automation in the list of the org, with the state of its last run. */
export type AutomationRow = {
  automation: Automation
  lastRun?: { state: RunState; when: string }
}

/** An automation that Jonas turned off, which only the list shows. */
const changelog: Automation = {
  key: 'changelog',
  name: 'Update the changelog',
  repository: 'marketing-site',
  section: 'general',
  owner: people.jonas,
  active: false,
  timeZone: london,
  triggers: [{ kind: 'pull-request', event: 'merged' }],
  prompt:
    'Add a line for this pull request to the changelog page, and open a pull request with it.',
  choice: defaultChoice,
  saved: true,
}

/** The automations of Acme, as its Automations page lists them. */
export const automationRows: readonly AutomationRow[] = [
  {
    automation: automations['review-prs'],
    lastRun: { state: 'working', when: 'now' },
  },
  {
    automation: automations['error-triage'],
    lastRun: { state: 'failed', when: '5m' },
  },
  {
    automation: automations['dependency-updates'],
    lastRun: { state: 'ready', when: '3d' },
  },
  { automation: changelog, lastRun: { state: 'archived', when: '6d' } },
  {
    automation: automations['copy-review'],
    lastRun: { state: 'stopped', when: '2w' },
  },
]

/**
 * The same automations after the operator suspended Acme a minute ago. The
 * suspension stopped the workspace of each last run.
 */
export const suspendedAutomationRows: readonly AutomationRow[] =
  automationRows.map((row) => {
    if (!row.lastRun) return row
    const { state, when } = row.lastRun
    return {
      ...row,
      lastRun: {
        state: stateAfterSuspension(state),
        when: when === 'now' ? '1m' : when,
      },
    }
  })
