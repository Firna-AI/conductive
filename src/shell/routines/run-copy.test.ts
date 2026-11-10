import { describe, expect, test } from 'vitest'
import type { RoutinePullRequestEvent, RoutineRun } from '../../shared/routines'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { pullRequestTrigger } from '../../test-support/fixtures/routine-runs'
import { skipCopy } from './run-copy'

/** The words of each skip, as the Worker stores them. */
const workerWords: Readonly<Record<string, string>> = {
  author_not_allowed:
    'The pull request author is outside the org and is not in Author is.',
  sender_not_allowed:
    'The event sender is outside the org and is not in Author is.',
  org_suspended: 'The org is suspended.',
  owner_left: 'The routine owner left the org.',
}

/** A skipped run of a pull request event, with the login that it names. */
function skipped(
  event: RoutinePullRequestEvent,
  code: string,
  login?: string,
): RoutineRun {
  return {
    id: 'run-1',
    routineId: 'review-prs',
    orgId: 'acme',
    trigger: pullRequestTrigger('storefront', event, 489, login),
    state: 'skipped',
    workspaceId: null,
    error: { code, message: workerWords[code] },
    createdAt: FAKE_TIME,
    updatedAt: FAKE_TIME,
  }
}

describe('the words of a skipped run', () => {
  test('name the author who opened the pull request, or the sender of the event', () => {
    const author = 'author_not_allowed'
    const sender = 'sender_not_allowed'
    expect({
      authorOfOpen: skipCopy(skipped('opened', author, 'rui-silva'), 'Acme'),
      authorOfPush: skipCopy(skipped('pushed', author, 'rui-silva'), 'Acme'),
      senderOfOpen: skipCopy(skipped('opened', sender, 'octo-bot'), 'Acme'),
      senderOfPush: skipCopy(
        skipped('pushed', sender, 'github-actions[bot]'),
        'Acme',
      ),
      senderOfMerge: skipCopy(skipped('merged', sender, 'octo-bot'), 'Acme'),
    }).toEqual({
      authorOfOpen: 'Opened by @rui-silva, not a member of Acme.',
      authorOfPush: 'Opened by @rui-silva, not a member of Acme.',
      senderOfOpen: 'Opened by @octo-bot, not a member of Acme.',
      senderOfPush: 'Pushed by @github-actions[bot], not a member of Acme.',
      senderOfMerge: 'Merged by @octo-bot, not a member of Acme.',
    })
  })

  test('name a suspended org, and keep the Worker words of an older skip and of each other reason', () => {
    expect({
      suspended: skipCopy(skipped('pushed', 'org_suspended'), 'Acme'),
      olderSkip: skipCopy(skipped('opened', 'author_not_allowed'), 'Acme'),
      ownerLeft: skipCopy(skipped('opened', 'owner_left'), 'Acme'),
      ownerLeftWithLogin: skipCopy(
        skipped('pushed', 'owner_left', 'rui-silva'),
        'Acme',
      ),
    }).toEqual({
      suspended: 'Acme is suspended.',
      olderSkip: workerWords.author_not_allowed,
      ownerLeft: workerWords.owner_left,
      ownerLeftWithLogin: workerWords.owner_left,
    })
  })
})
