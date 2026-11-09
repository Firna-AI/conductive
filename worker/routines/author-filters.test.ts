import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { routinePath, routinesPath } from '../../src/shared/routines'
import { leaveOrgPath } from '../../src/shared/orgs'
import { write } from '../members/members-test-support'
import { saveGitHubTokens } from '../security/github-tokens'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { routineFixture } from './routes.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

async function authorsFixture() {
  const fixture = await routineFixture(harness)
  await saveGitHubTokens(
    harness.env,
    fixture.member.user.id,
    {
      accessToken: 'routine-github-token',
      expiresAt: null,
      refreshToken: null,
      refreshExpiresAt: null,
    },
    TEST_TIME,
  )
  harness.github.accounts.set('member', { id: 11, login: 'member' })
  harness.github.accounts.set('dependabot[bot]', {
    id: 49699333,
    login: 'dependabot[bot]',
  })
  return fixture
}

it('resolves member and bot logins to account IDs in both author lists at each save', async () => {
  const { member, org, create } = await authorsFixture()
  const created = await create({
    triggers: [
      {
        kind: 'pull-request',
        event: 'opened',
        authors: { members: true, is: ['dependabot[bot]'], isNot: ['MEMBER'] },
      },
      {
        kind: 'pull-request',
        event: 'pushed',
        authors: { members: false, is: ['member'], isNot: [] },
      },
      { kind: 'pull-request', event: 'merged' },
    ],
  })
  expect(created.triggers).toEqual([
    {
      kind: 'pull-request',
      event: 'opened',
      authors: {
        members: true,
        is: [{ githubId: 49699333, login: 'dependabot[bot]' }],
        isNot: [{ githubId: 11, login: 'member' }],
      },
    },
    {
      kind: 'pull-request',
      event: 'pushed',
      authors: {
        members: false,
        is: [{ githubId: 11, login: 'member' }],
        isNot: [],
      },
    },
    { kind: 'pull-request', event: 'merged' },
  ])
  expect(created.nextRunAt).toBeNull()
  expect(
    harness.github.requests.map((request) =>
      request.headers.get('Authorization'),
    ),
  ).toEqual(['Bearer routine-github-token', 'Bearer routine-github-token'])
  harness.github.accounts.set('member', { id: 1111, login: 'member' })
  const changed = await harness.request(
    routinePath(org.id, created.id),
    member.session,
    write({ name: 'Saved again' }, 'PATCH'),
  )
  expect(changed.status).toBe(200)
  expect(await changed.json()).toMatchObject({
    routine: {
      triggers: [
        {
          kind: 'pull-request',
          event: 'opened',
          authors: { isNot: [{ githubId: 1111, login: 'member' }] },
        },
        {
          kind: 'pull-request',
          event: 'pushed',
          authors: { is: [{ githubId: 1111, login: 'member' }] },
        },
        { kind: 'pull-request', event: 'merged' },
      ],
    },
  })
  await harness.env.DB.prepare(
    'DELETE FROM github_connections WHERE user_id = ?',
  )
    .bind(member.user.id)
    .run()
  const disabled = await harness.request(
    routinePath(org.id, created.id),
    member.session,
    write({ active: false }, 'PATCH'),
  )
  expect(disabled.status).toBe(200)
  expect(await disabled.json()).toMatchObject({
    routine: {
      active: false,
      triggers: [
        {
          kind: 'pull-request',
          event: 'opened',
          authors: { isNot: [{ githubId: 1111, login: 'member' }] },
        },
        {
          kind: 'pull-request',
          event: 'pushed',
          authors: { is: [{ githubId: 1111, login: 'member' }] },
        },
        { kind: 'pull-request', event: 'merged' },
      ],
    },
  })
})

it('names an unknown login and preserves the routine when a save refuses it', async () => {
  const { org, member, admin, input, seed } = await authorsFixture()
  const path = await seed()
  const body = {
    ...input,
    triggers: [
      {
        kind: 'pull-request',
        event: 'opened',
        authors: { members: true, is: ['missing-account'], isNot: [] },
      },
    ],
  }
  for (const [target, method] of [
    [routinesPath(org.id), 'POST'],
    [path, 'PATCH'],
  ] as const) {
    const response = await harness.request(
      target,
      member.session,
      write(body, method),
    )
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: {
        code: 'unknown_github_login',
        message:
          'GitHub account missing-account was not found. Check the login.',
      },
    })
  }
  const read = await harness.request(path, admin.session)
  expect(await read.json()).toMatchObject({
    routine: {
      name: 'Morning summary',
      triggers: [{ kind: 'daily', cron: '0 9 * * *' }],
    },
  })
  expect(
    await harness.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM routines',
    ).first('count'),
  ).toBe(1)
})

it('refuses a save when the owner leaves during the GitHub lookup', async () => {
  const { org, member, input, seed, members } = await authorsFixture()
  const path = await seed()
  const fetch = harness.github.fetch
  harness.github.fetch = async (request) => {
    const response = await fetch(request)
    await members.request(leaveOrgPath(org.id), member.session, write({}))
    return response
  }
  try {
    const response = await harness.request(
      path,
      member.session,
      write(
        {
          ...input,
          name: 'Late save',
          triggers: [
            {
              kind: 'pull-request',
              event: 'opened',
              authors: { members: true, is: ['member'], isNot: [] },
            },
          ],
        },
        'PATCH',
      ),
    )
    expect(response.status).toBe(404)
    expect(
      await harness.env.DB.prepare('SELECT name FROM routines WHERE id = ?')
        .bind('routine-one')
        .first('name'),
    ).toBe('Morning summary')
  } finally {
    harness.github.fetch = fetch
  }
})
