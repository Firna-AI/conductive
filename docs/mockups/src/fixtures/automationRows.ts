/**
 * The automations of Acme as its Automations page lists them, with the state of
 * the last run of each.
 */

import { stateAfterSuspension, type RunState } from './automationRuns'
import { changelog, automations, type Automation } from './automations'

/** An automation in the list of the org, with the state of its last run. */
export type AutomationRow = {
  automation: Automation
  lastRun?: { state: RunState; when: string }
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
