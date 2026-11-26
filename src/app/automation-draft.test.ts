import { describe, expect, test } from 'vitest'
import type { Automation } from '../shared/automations'
import { cronProblem } from './automation-cron'
import {
  draftOf,
  sameDraft,
  updateRequest,
  withChosenSecret,
} from './automation-draft'
import { addAuthor, removeAuthor, setMembers } from './automation-triggers'

/**
 * A saved automation with a preset schedule, an author filter of accounts,
 * and two chosen secrets.
 */
const saved: Automation = {
  id: 'error-triage',
  orgId: 'acme',
  owner: {
    id: 'cal',
    githubLogin: 'calummoore',
    displayName: 'Cal',
    avatarUrl: null,
  },
  movedFrom: null,
  name: 'Triage new errors',
  repositoryId: 'billing-service',
  sectionId: 'infra',
  prompt: 'Read the errors of the last hour.',
  choice: { agent: 'claude', model: 'Opus 5.5', effort: 'high', fast: false },
  capabilities: { preapprovedSecretIds: ['figma-token', 'vercel-token'] },
  active: false,
  inactiveReason: 'failed_runs',
  failedRunsInARow: 3,
  timeZone: 'Europe/London',
  triggers: [
    { kind: 'hourly', minute: 15, cron: '15 * * * *' },
    {
      kind: 'pull-request',
      event: 'opened',
      authors: {
        members: true,
        is: [{ githubId: 49699333, login: 'dependabot[bot]' }],
        isNot: [{ githubId: 1, login: 'calummoore' }],
      },
    },
  ],
  nextRunAt: null,
  createdAt: 1_799_000_000_000,
  updatedAt: 1_799_000_000_000,
}

describe('the draft of an automation', () => {
  test('a saved automation becomes a draft with logins, its chosen secrets, and without the cron of a preset', () => {
    expect(draftOf(saved)).toEqual({
      name: 'Triage new errors',
      active: false,
      repositoryId: 'billing-service',
      sectionId: 'infra',
      prompt: 'Read the errors of the last hour.',
      choice: {
        agent: 'claude',
        model: 'Opus 5.5',
        effort: 'high',
        fast: false,
      },
      capabilities: { preapprovedSecretIds: ['figma-token', 'vercel-token'] },
      timeZone: 'Europe/London',
      triggers: [
        { kind: 'hourly', minute: 15 },
        {
          kind: 'pull-request',
          event: 'opened',
          authors: {
            members: true,
            is: ['dependabot[bot]'],
            isNot: ['calummoore'],
          },
        },
      ],
    })
  })

  test('an update sends only the fields that changed, also fast mode alone, Active only when the owner changed it, and the chosen secrets only when other secrets are chosen', () => {
    const draft = draftOf(saved)
    const fast = { ...draft, choice: { ...draft.choice, fast: true } }
    // A check that the owner takes back leaves the same secrets in another order.
    const takenBack = withChosenSecret(
      withChosenSecret(draft, 'figma-token', false),
      'figma-token',
      true,
    )
    expect({
      unchanged: updateRequest(draft, draft),
      prompt: updateRequest(draft, { ...draft, prompt: 'Group the errors.' }),
      active: updateRequest(draft, { ...draft, active: true }),
      trigger: updateRequest(draft, {
        ...draft,
        triggers: [{ kind: 'hourly', minute: 30 }],
      }),
      model: updateRequest(draft, {
        ...draft,
        choice: {
          agent: 'codex',
          model: 'GPT-6.1 Sol',
          effort: 'medium',
          fast: false,
        },
      }),
      fast: {
        same: sameDraft(fast, draft),
        update: updateRequest(draft, fast),
      },
      chosen: updateRequest(
        draft,
        withChosenSecret(draft, 'prod-database-url', true),
      ),
      unchosen: updateRequest(
        draft,
        withChosenSecret(draft, 'vercel-token', false),
      ),
      takenBack: {
        same: sameDraft(takenBack, draft),
        update: updateRequest(draft, takenBack),
      },
    }).toEqual({
      unchanged: {},
      prompt: { prompt: 'Group the errors.' },
      active: { active: true },
      trigger: { triggers: [{ kind: 'hourly', minute: 30 }] },
      model: {
        choice: {
          agent: 'codex',
          model: 'GPT-6.1 Sol',
          effort: 'medium',
          fast: false,
        },
      },
      fast: {
        same: false,
        update: {
          choice: {
            agent: 'claude',
            model: 'Opus 5.5',
            effort: 'high',
            fast: true,
          },
        },
      },
      chosen: {
        capabilities: {
          preapprovedSecretIds: [
            'figma-token',
            'vercel-token',
            'prod-database-url',
          ],
        },
      },
      unchosen: { capabilities: { preapprovedSecretIds: ['figma-token'] } },
      takenBack: { same: true, update: {} },
    })
  })

  test('a custom cron passes only with five valid fields whose minute names one minute', () => {
    const cases: readonly [string, ReturnType<typeof cronProblem>][] = [
      ['0 9 * * 1-5', null],
      ['  30   7 * * 1 ', null],
      ['*/15 9-17 * * 1-5', 'frequent'],
      ['0,30 * * * *', 'frequent'],
      ['* * * * *', 'frequent'],
      ['0 9 * *', 'invalid'],
      ['0 9 * * * *', 'invalid'],
      ['0 25 * * *', 'invalid'],
      ['', 'invalid'],
    ]
    for (const [cron, problem] of cases) {
      expect(cronProblem(cron), JSON.stringify(cron)).toBe(problem)
    }
  })
})

describe('the author filter of a pull request trigger', () => {
  test('the first account in an empty Author is adds Members of the org first, and the owner can remove that entry', () => {
    const first = addAuthor(undefined, 'is', '@dependabot[bot]')
    const second = addAuthor(first, 'is', 'renovate[bot]')
    const repeated = addAuthor(second, 'is', 'Renovate[bot]')
    const withoutMembers = setMembers(second, false)
    const third = addAuthor(withoutMembers, 'is', 'octocat')
    const excluded = addAuthor(undefined, 'isNot', 'calummoore')
    expect({
      first,
      second,
      repeated,
      withoutMembers,
      third,
      excluded,
      emptied: removeAuthor(excluded, 'isNot', 'calummoore'),
    }).toEqual({
      first: { members: true, is: ['dependabot[bot]'], isNot: [] },
      second: {
        members: true,
        is: ['dependabot[bot]', 'renovate[bot]'],
        isNot: [],
      },
      repeated: {
        members: true,
        is: ['dependabot[bot]', 'renovate[bot]'],
        isNot: [],
      },
      withoutMembers: {
        members: false,
        is: ['dependabot[bot]', 'renovate[bot]'],
        isNot: [],
      },
      third: {
        members: false,
        is: ['dependabot[bot]', 'renovate[bot]', 'octocat'],
        isNot: [],
      },
      excluded: { members: false, is: [], isNot: ['calummoore'] },
      emptied: undefined,
    })
  })
})
