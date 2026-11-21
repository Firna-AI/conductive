import { describe, expect, test } from 'vitest'
import type { MessageSender } from '../../shared/generated/MessageSender'
import { routes } from '../../app/router'
import type {
  AutomationPullRequestEvent,
  AutomationRun,
} from '../../shared/automations'
import { FAKE_TIME, fakeUser } from '../../test-support/fixtures/core'
import { pullRequestTrigger } from '../../test-support/fixtures/automation-runs'
import { failureCopy, skipCopy } from './run-copy'

/** Cal, who owns the review automation and signs in. */
const cal: MessageSender = {
  id: fakeUser.id,
  githubLogin: fakeUser.githubLogin,
  displayName: fakeUser.displayName,
  avatarUrl: fakeUser.avatarUrl,
}

/** Lena Park, who left the org, so her automation moved to Cal. Her user record stays. */
const lena: MessageSender = {
  id: 'lena',
  githubLogin: 'lenapark',
  displayName: 'Lena Park',
  avatarUrl: null,
}

/** The words of each skip, as the Worker stores them. */
const workerWords: Readonly<Record<string, string>> = {
  author_not_allowed:
    'The pull request author is outside the org and is not in Author is.',
  sender_not_allowed:
    'The event sender is outside the org and is not in Author is.',
  org_suspended: 'The org is suspended.',
  owner_left: 'The automation owner left the org.',
}

/** A skipped run of a pull request event, with the login that it names. */
function skipped(
  event: AutomationPullRequestEvent,
  code: string,
  login?: string,
): AutomationRun {
  return {
    id: 'run-1',
    automationId: 'review-prs',
    orgId: 'acme',
    agent: 'claude',
    owner: cal,
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

/**
 * A failed run of a pull request event, with the facts that the Worker kept.
 * A run whose chain a provider stop ended has the source of its failure.
 */
function failed(
  facts: Pick<AutomationRun, 'agent' | 'owner' | 'workspaceId'>,
  code: string,
  message: string,
  source?: 'provider_stop',
): AutomationRun {
  return {
    id: 'run-2',
    automationId: 'review-prs',
    orgId: 'acme',
    ...facts,
    trigger: pullRequestTrigger('storefront', 'opened', 488),
    state: 'failed',
    error: { code, message, ...(source ? { source } : {}) },
    createdAt: FAKE_TIME,
    updatedAt: FAKE_TIME,
  }
}

/** Priya, a member of Acme who does not own the automation. */
const priya = 'priya'

/** The words that the Worker stores for each cause of a failed check. */
const loginWords = 'Connect Claude to run this automation.'
const githubWords = 'GitHub access expired. Sign in with GitHub again.'

/** The words that the Worker stores for each end of a chain that a provider stop ended. */
const stoppedWords =
  'The cloud computer stopped before the agent finished. Send a message in the workspace to continue.'
const lostLoginWords =
  'Connect the agent login again to continue in the workspace.'

describe('the words of a failed run', () => {
  test('name the owner of the run after the automation moved to another owner, who gets no action', () => {
    const before = { agent: 'claude', owner: lena, workspaceId: null } as const
    expect({
      login: failureCopy(
        failed(before, 'agent_login_required', loginWords),
        cal.id,
      ),
      github: failureCopy(
        failed(before, 'github_reconnect_required', githubWords),
        cal.id,
      ),
    }).toEqual({
      login: {
        text: "Lena Park's Claude login isn't connected.",
        action: null,
      },
      github: { text: "Lena Park's GitHub access expired.", action: null },
    })
  })

  test('keep the stored words, with no action, of a first turn whose sender left and of a run from before runs kept their agent and owner', () => {
    const senderLeft =
      'The message sender no longer has access to this workspace.'
    expect({
      senderLeft: failureCopy(
        failed(
          { agent: 'claude', owner: cal, workspaceId: 'review-prs-opened-488' },
          'agent_login_required',
          senderLeft,
        ),
        cal.id,
      ),
      noAgent: failureCopy(
        failed(
          { agent: null, owner: cal, workspaceId: null },
          'agent_login_required',
          loginWords,
        ),
        cal.id,
      ),
      noOwner: failureCopy(
        failed(
          { agent: 'claude', owner: null, workspaceId: null },
          'github_reconnect_required',
          githubWords,
        ),
        cal.id,
      ),
    }).toEqual({
      senderLeft: { text: senderLeft, action: null },
      noAgent: { text: loginWords, action: null },
      noOwner: { text: githubWords, action: null },
    })
  })

  test('a chain that a provider stop ended says what stopped, and how to continue only where someone can act', () => {
    const run = failed(
      { agent: 'claude', owner: cal, workspaceId: 'review-prs-pushed-483' },
      'cloud_computer_stopped',
      stoppedWords,
      'provider_stop',
    )
    expect({
      member: failureCopy(run, priya),
      nobody: failureCopy(run, null),
    }).toEqual({
      member: {
        text: 'The cloud computer stopped before the agent finished. Send a message in the workspace to continue.',
        action: null,
      },
      nobody: {
        text: 'The cloud computer stopped before the agent finished.',
        action: null,
      },
    })
  })

  test('a login that was gone at the provider stop reads as a failed check of the login, though the run kept its workspace', () => {
    const run = failed(
      { agent: 'claude', owner: cal, workspaceId: 'review-prs-pushed-481' },
      'agent_login_required',
      lostLoginWords,
      'provider_stop',
    )
    expect({
      owner: failureCopy(run, cal.id),
      member: failureCopy(run, priya),
    }).toEqual({
      owner: {
        text: "Your Claude login isn't connected.",
        action: {
          label: 'Connect Claude',
          to: routes.account('claude'),
          leavesApp: false,
        },
      },
      member: { text: "Cal's Claude login isn't connected.", action: null },
    })
  })
})
