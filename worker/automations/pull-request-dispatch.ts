import type { AutomationAuthorFilter } from '../../src/shared/automations'
import type { GitHubPullRequestEvent } from '../github/webhook-routing'
import { pullRequestMembers, pullRequestAutomations } from './pull-request-data'
import { recordAutomationRun } from './run-record-data'
import { startAutomationRun, type AutomationRunRuntime } from './run-starter'
import { readAutomationTriggers } from './stored-triggers'

function filterPasses(
  filter: AutomationAuthorFilter | undefined,
  authorId: number,
  members: Set<number>,
) {
  if (!filter) return true
  if (filter.isNot.some((account) => account.githubId === authorId))
    return false
  return (
    filter.is.length === 0 ||
    filter.is.some((account) => account.githubId === authorId) ||
    (filter.members && members.has(authorId))
  )
}

function trusted(
  filter: AutomationAuthorFilter | undefined,
  id: number,
  members: Set<number>,
) {
  return (
    members.has(id) ||
    filter?.is.some((account) => account.githubId === id) === true
  )
}

export async function dispatchPullRequestRuns(
  runtime: AutomationRunRuntime,
  event: GitHubPullRequestEvent,
  deliveryId: string,
  background: (work: () => Promise<void>) => void,
): Promise<void> {
  const { DB: db } = runtime.env
  const automations = await pullRequestAutomations(db, event)
  const results = await Promise.allSettled(
    automations.map(async (automation) => {
      const members = await pullRequestMembers(db, automation.orgId)
      const triggers = readAutomationTriggers(automation.triggersJson).filter(
        (trigger) =>
          trigger.kind === 'pull-request' &&
          trigger.event === event.trigger.event &&
          filterPasses(trigger.authors, event.authorId, members),
      )
      if (!triggers.length) return
      let skip: { code: string; message: string; login?: string } | undefined
      for (const trigger of triggers) {
        if (trigger.kind !== 'pull-request') continue
        if (!trusted(trigger.authors, event.authorId, members)) {
          skip = {
            code: 'author_not_allowed',
            message:
              'The pull request author is outside the org and is not in Author is.',
            login: event.authorLogin,
          }
        } else if (!trusted(trigger.authors, event.senderId, members)) {
          skip = {
            code: 'sender_not_allowed',
            message:
              'The event sender is outside the org and is not in Author is.',
            login: event.senderLogin,
          }
        } else {
          skip = undefined
          break
        }
      }
      const id = await recordAutomationRun(
        db,
        {
          orgId: automation.orgId,
          automationId: automation.id,
          ownerId: automation.ownerId,
          triggersJson: automation.triggersJson,
          senderGitHubId: event.senderId,
          runKey: `github:${automation.id}:${deliveryId}`,
          trigger:
            skip?.login === undefined
              ? event.trigger
              : { ...event.trigger, skipLogin: skip.login },
          skip,
        },
        runtime.dependencies,
      )
      if (id && !skip)
        background(() => startAutomationRun(runtime, automation.orgId, id))
    }),
  )
  const failed = results.find((result) => result.status === 'rejected')
  if (failed?.status === 'rejected') throw failed.reason
}
