import type { RoutineAuthorFilter } from '../../src/shared/routines'
import type { GitHubPullRequestEvent } from '../github/webhook-routing'
import { pullRequestMembers, pullRequestRoutines } from './pull-request-data'
import { recordRoutineRun } from './run-record-data'
import { startRoutineRun, type RoutineRunRuntime } from './run-starter'
import { readRoutineTriggers } from './stored-triggers'

function filterPasses(
  filter: RoutineAuthorFilter | undefined,
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
  filter: RoutineAuthorFilter | undefined,
  id: number,
  members: Set<number>,
) {
  return (
    members.has(id) ||
    filter?.is.some((account) => account.githubId === id) === true
  )
}

export async function dispatchPullRequestRuns(
  runtime: RoutineRunRuntime,
  event: GitHubPullRequestEvent,
  deliveryId: string,
  background: (work: () => Promise<void>) => void,
): Promise<void> {
  const { DB: db } = runtime.env
  const routines = await pullRequestRoutines(db, event)
  const results = await Promise.allSettled(
    routines.map(async (routine) => {
      const members = await pullRequestMembers(db, routine.orgId)
      const triggers = readRoutineTriggers(routine.triggersJson).filter(
        (trigger) =>
          trigger.kind === 'pull-request' &&
          trigger.event === event.trigger.event &&
          filterPasses(trigger.authors, event.authorId, members),
      )
      if (!triggers.length) return
      let skip: { code: string; message: string } | undefined
      for (const trigger of triggers) {
        if (trigger.kind !== 'pull-request') continue
        if (!trusted(trigger.authors, event.authorId, members)) {
          skip = {
            code: 'author_not_allowed',
            message:
              'The pull request author is outside the org and is not in Author is.',
          }
        } else if (!trusted(trigger.authors, event.senderId, members)) {
          skip = {
            code: 'sender_not_allowed',
            message:
              'The event sender is outside the org and is not in Author is.',
          }
        } else {
          skip = undefined
          break
        }
      }
      const id = await recordRoutineRun(
        db,
        {
          orgId: routine.orgId,
          routineId: routine.id,
          ownerId: routine.ownerId,
          triggersJson: routine.triggersJson,
          senderGitHubId: event.senderId,
          runKey: `github:${routine.id}:${deliveryId}`,
          trigger: event.trigger,
          skip,
        },
        runtime.dependencies,
      )
      if (id && !skip)
        background(() => startRoutineRun(runtime, routine.orgId, id))
    }),
  )
  const failed = results.find((result) => result.status === 'rejected')
  if (failed?.status === 'rejected') throw failed.reason
}
