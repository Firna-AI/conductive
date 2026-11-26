import type { MessageSender } from '../../shared/generated/MessageSender'
import { automationRows } from '../../../docs/mockups/src/fixtures/automationRows'
import type { RunState } from '../../ui/components/workspaces/activityStatus'
import {
  offAfterFailedRuns,
  automations as mockupAutomations,
  type Automation as MockupAutomation,
} from '../../../docs/mockups/src/fixtures/automations'
import type {
  Automation,
  AutomationInactiveReason,
  AutomationRun,
  AutomationRunTrigger,
  AutomationsResponse,
} from '../../shared/automations'
import { FAKE_IDS, FAKE_TIME, fakeUsers } from './core'
import {
  listRuns,
  pullRequestTrigger,
  runListOf,
  timeOf,
} from './automation-runs'
import { fakeAccount, storedTrigger } from './automation-triggers'
import { secretFixtures } from './secrets'

const day = 86_400_000

function sender(automation: MockupAutomation): MessageSender {
  const user = fakeUsers.find((item) => item.id === automation.owner.key)
  if (!user) throw new Error(`Unknown owner: ${automation.owner.key}`)
  return {
    id: user.id,
    githubLogin: user.githubLogin,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  }
}

/** Why the app turned the automation off, or null for an active automation. */
function inactiveReason(
  automation: MockupAutomation,
): AutomationInactiveReason | null {
  if (automation.active) return null
  if (offAfterFailedRuns(automation)) return 'failed_runs'
  if (automation.movedFrom !== undefined) return 'owner_left'
  return null
}

/** What started a run: the first trigger of its automation. */
function runTrigger(
  automation: MockupAutomation,
  at: number,
): AutomationRunTrigger {
  const [first] = automation.triggers
  if (!first) return { kind: 'run-now' }
  if (first.kind !== 'pull-request') {
    return { kind: 'schedule', schedule: first.kind, scheduledAt: at }
  }
  return pullRequestTrigger(automation.repository, first.event, 482)
}

/**
 * The last run of a row. A failed run has the cause of a missing agent
 * login and no workspace, as the mockups draw it.
 */
function lastRun(
  automation: MockupAutomation,
  run: { state: RunState; when: string },
  orgId: string,
): AutomationRun {
  const at = timeOf(run.when)
  const workspace = !['queued', 'failed', 'skipped'].includes(run.state)
  return {
    id: `${automation.key}-last`,
    automationId: automation.key,
    orgId,
    agent: automation.choice.agent,
    owner: sender(automation),
    trigger: runTrigger(automation, at),
    state: run.state,
    workspaceId: workspace ? `${automation.key}-run` : null,
    error:
      run.state === 'failed'
        ? {
            code: 'agent_login_required',
            message: 'Connect Claude to run this automation.',
          }
        : null,
    createdAt: at,
    updatedAt: at,
  }
}

function record(
  automation: MockupAutomation,
  index: number,
  orgId: string,
): Automation {
  const createdAt = FAKE_TIME - (30 + index) * day
  const triggers = automation.triggers.map((item) =>
    storedTrigger(item, fakeAccount),
  )
  const scheduled = triggers.some((item) => item.kind !== 'pull-request')
  const secrets = secretFixtures().secrets
  return {
    id: automation.key,
    orgId,
    owner: sender(automation),
    movedFrom: automation.movedFrom ?? null,
    name: automation.name,
    repositoryId: automation.repository,
    sectionId: automation.section,
    prompt: automation.prompt,
    choice: { ...automation.choice, fast: automation.choice.fast ?? false },
    capabilities: {
      preapprovedSecretIds: secrets
        .filter((secret) => automation.preApproved?.includes(secret.name))
        .map((secret) => secret.id)
        .sort(),
    },
    active: automation.active,
    inactiveReason: inactiveReason(automation),
    failedRunsInARow: automation.failedRunsInARow ?? 0,
    timeZone: automation.timeZone,
    triggers,
    nextRunAt: automation.active && scheduled ? FAKE_TIME + 3_600_000 : null,
    createdAt,
    updatedAt: createdAt,
  }
}

/**
 * The automations of Acme as the mockups list them, newest first, as the
 * Worker sorts them. `list` is the reply of the list route, with the last
 * run of each automation that the Automations page of the mockups shows.
 * `automations` and `runs` are the records that the test fake and the dev
 * fake serve: each automation has the runs that its page in the mockups
 * lists, or else its last run. `created` is the reply of a create.
 */
export function automationFixtures(orgId: string = FAKE_IDS.org) {
  const automations: Automation[] = automationRows.map((row, index) =>
    record(row.automation, index, orgId),
  )
  const lastRuns: AutomationRun[] = automationRows.flatMap((row) =>
    row.lastRun ? [lastRun(row.automation, row.lastRun, orgId)] : [],
  )
  const list: AutomationsResponse = {
    automations: automations.map((automation) => ({
      ...automation,
      lastRun:
        lastRuns.find((run) => run.automationId === automation.id) ?? null,
    })),
  }
  const runs = automations.flatMap((automation) => {
    const runList = runListOf[automation.id]
    if (runList) return listRuns(automation, runList)
    return lastRuns.filter((run) => run.automationId === automation.id)
  })
  // The automation that the flow "Create an automation" saves, as a create answers.
  const created: Automation = {
    ...record(mockupAutomations['morning-summary'], 0, orgId),
    createdAt: FAKE_TIME,
    updatedAt: FAKE_TIME,
  }
  return { list, automations, runs, created }
}
