import { expect, it } from 'vitest'

import { saveGitHubTokens } from '../security/github-tokens'
import {
  fakeSkillsGitHub,
  setupSkillsLookupTests,
  SKILLS_LOOKUP_PATH,
  SKILLS_SETTINGS_PATH,
} from './skills-test-support'

const fixtureForTest = setupSkillsLookupTests()

it.each([
  {
    scenario: 'an expired stored sign-in',
    recordStatus: 200,
    treeStatus: 200,
    expired: true,
    calls: 0,
  },
  {
    scenario: 'a revoked token at the repository read',
    recordStatus: 401,
    treeStatus: 200,
    expired: false,
    calls: 1,
  },
  {
    scenario: 'a revoked token at the tree read',
    recordStatus: 200,
    treeStatus: 401,
    expired: false,
    calls: 2,
  },
])(
  'keeps the sign-in error for $scenario',
  async ({ recordStatus, treeStatus, expired, calls }) => {
    const fixture = fixtureForTest()
    if (expired)
      await saveGitHubTokens(
        fixture.env,
        'owner',
        {
          accessToken: 'expired-token',
          expiresAt: 1,
          refreshToken: 'expired-refresh',
          refreshExpiresAt: 2,
        },
        Date.now(),
      )
    fakeSkillsGitHub(fixture, { recordStatus, treeStatus })
    const response = await fixture.request(SKILLS_LOOKUP_PATH)
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      error: {
        code: 'github_reconnect_required',
        message: 'GitHub access expired. Sign in with GitHub again.',
      },
    })
    expect(fixture.github.requests).toHaveLength(calls)
    expect((await fixture.request(SKILLS_SETTINGS_PATH)).status).toBe(200)
  },
)

it('refuses a non-member before any GitHub request', async () => {
  const fixture = fixtureForTest()
  fakeSkillsGitHub(fixture)
  const response = await fixture.request(SKILLS_LOOKUP_PATH, {
    headers: { Cookie: fixture.cookies.outsiderCookie },
  })
  expect(response.status).toBe(404)
  expect(await response.json()).toEqual({
    error: {
      code: 'org_not_found',
      message: 'The org is not available.',
    },
  })
  expect(fixture.github.requests).toEqual([])
})
