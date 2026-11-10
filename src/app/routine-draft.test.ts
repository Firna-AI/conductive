import { describe, expect, test } from 'vitest'
import type { Routine } from '../shared/routines'
import { cronProblem } from './routine-cron'
import { draftOf, updateRequest } from './routine-draft'
import { addAuthor, removeAuthor, setMembers } from './routine-triggers'

/** A saved routine with a preset schedule and an author filter of accounts. */
const saved: Routine = {
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
  choice: { agent: 'claude', model: 'Opus 5.5', effort: 'high' },
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

describe('the draft of a routine', () => {
  test('a saved routine becomes a draft with logins, and without the cron of a preset', () => {
    expect(draftOf(saved)).toEqual({
      name: 'Triage new errors',
      active: false,
      repositoryId: 'billing-service',
      sectionId: 'infra',
      prompt: 'Read the errors of the last hour.',
      choice: { agent: 'claude', model: 'Opus 5.5', effort: 'high' },
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

  test('an update sends only the fields that changed, and Active only when the owner changed it', () => {
    const draft = draftOf(saved)
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
        choice: { agent: 'codex', model: 'GPT-6.1 Sol', effort: 'medium' },
      }),
    }).toEqual({
      unchanged: {},
      prompt: { prompt: 'Group the errors.' },
      active: { active: true },
      trigger: { triggers: [{ kind: 'hourly', minute: 30 }] },
      model: {
        choice: { agent: 'codex', model: 'GPT-6.1 Sol', effort: 'medium' },
      },
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
