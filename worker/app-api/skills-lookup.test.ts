import { expect, it } from 'vitest'

import { OUTER_ORG } from '../chat/integration/outer-seed.test-support'
import {
  fakeSkillsGitHub,
  setupSkillsLookupTests,
  SKILLS_GITHUB_REPO,
  SKILLS_GITHUB_TREE,
  SKILLS_LOOKUP_PATH,
  SKILLS_SETTINGS_PATH,
} from './skills-test-support'

const fixtureForTest = setupSkillsLookupTests()

it('lists saved skills with the viewing member token on only the repository and default-branch tree routes', async () => {
  const fixture = fixtureForTest()
  fakeSkillsGitHub(fixture, {
    paths: [
      'skills/zebra/SKILL.md',
      'skills/.system/apple/SKILL.md',
      'skills/.curated/apple/SKILL.md',
      'skills/zebra/nested/SKILL.md',
    ],
  })
  const response = await fixture.request(SKILLS_LOOKUP_PATH, {
    headers: { Cookie: fixture.cookies.memberCookie },
  })
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({
    repository: 'owner/skills',
    skills: ['apple', 'zebra'],
    notice: null,
    clashes: [
      {
        name: 'apple',
        keptPath: 'skills/.curated/apple',
        skippedPath: 'skills/.system/apple',
      },
    ],
  })
  expect(
    fixture.github.requests.map((request) => ({
      url: request.url,
      method: request.method,
      authorization: request.headers.get('Authorization'),
    })),
  ).toEqual([
    {
      url: `https://api.github.com${SKILLS_GITHUB_REPO}`,
      method: 'GET',
      authorization: 'Bearer skills-token-member',
    },
    {
      url: `https://api.github.com${SKILLS_GITHUB_TREE}`,
      method: 'GET',
      authorization: 'Bearer skills-token-member',
    },
  ])
  const again = await fixture.request(SKILLS_LOOKUP_PATH)
  expect(again.status).toBe(200)
  expect(
    fixture.github.requests
      .slice(2)
      .map((request) => request.headers.get('Authorization')),
  ).toEqual(['Bearer skills-token-owner', 'Bearer skills-token-owner'])
})

it.each([
  {
    layout: 'top-level skills',
    paths: ['zebra/SKILL.md', 'apple/SKILL.md'],
    skills: ['apple', 'zebra'],
  },
  { layout: 'a root skill', paths: ['SKILL.md'], skills: ['skills'] },
])('lists $layout from the GitHub tree', async ({ paths, skills }) => {
  const fixture = fixtureForTest()
  fakeSkillsGitHub(fixture, { paths })
  const response = await fixture.request(SKILLS_LOOKUP_PATH)
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({
    repository: 'owner/skills',
    skills,
    notice: null,
    clashes: [],
  })
})

it.each([
  {
    scenario: 'private',
    options: { private: true },
    notice: 'private',
    skills: [],
    calls: 1,
  },
  {
    scenario: 'not found',
    options: { recordStatus: 404 },
    notice: 'not-found',
    skills: [],
    calls: 1,
  },
  {
    scenario: 'no skills',
    options: { paths: ['skills/', 'top/SKILL.md', 'SKILL.md'] },
    notice: 'no-skills',
    skills: [],
    calls: 2,
  },
  {
    scenario: 'an empty repository',
    options: { treeStatus: 409, treeMessage: 'Git Repository is empty.' },
    notice: 'no-skills',
    skills: [],
    calls: 2,
  },
  {
    scenario: 'another tree conflict',
    options: {
      treeStatus: 409,
      treeMessage: 'Git Repository is empty. Try again.',
    },
    notice: 'failed',
    skills: [],
    calls: 2,
  },
  {
    scenario: 'the empty message with a different status',
    options: { treeStatus: 502, treeMessage: 'Git Repository is empty.' },
    notice: 'failed',
    skills: [],
    calls: 2,
  },
  {
    scenario: 'an empty message from the repository record',
    options: {
      recordStatus: 409,
      record: { message: 'Git Repository is empty.' },
    },
    notice: 'failed',
    skills: [],
    calls: 1,
  },
  {
    scenario: 'a cut tree',
    options: { truncated: true },
    notice: 'incomplete',
    skills: ['example'],
    calls: 2,
  },
  {
    scenario: 'a cut tree without skills',
    options: { truncated: true, paths: [] },
    notice: 'incomplete',
    skills: [],
    calls: 2,
  },
  {
    scenario: 'a failed repository read',
    options: { recordStatus: 503 },
    notice: 'failed',
    skills: [],
    calls: 1,
  },
  {
    scenario: 'a failed tree read',
    options: { treeStatus: 502 },
    notice: 'failed',
    skills: [],
    calls: 2,
  },
  {
    scenario: 'a malformed repository reply',
    options: { record: { private: 'false' } },
    notice: 'failed',
    skills: [],
    calls: 1,
  },
  {
    scenario: 'a malformed tree reply',
    options: { tree: { truncated: false, tree: [{ type: 'blob', path: 1 }] } },
    notice: 'failed',
    skills: [],
    calls: 2,
  },
  {
    scenario: 'a missing tree',
    options: { treeStatus: 404 },
    notice: 'not-found',
    skills: [],
    calls: 2,
  },
  {
    scenario: 'a redirect',
    options: { recordStatus: 301 },
    notice: 'failed',
    skills: [],
    calls: 1,
  },
])(
  'returns the cause for $scenario without failing settings',
  async ({ options, notice, skills, calls }) => {
    const fixture = fixtureForTest()
    fakeSkillsGitHub(fixture, options)
    const response = await fixture.request(SKILLS_LOOKUP_PATH)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      repository: 'owner/skills',
      skills,
      notice,
      clashes: [],
    })
    expect(fixture.github.requests).toHaveLength(calls)
    const settings = await fixture.request(SKILLS_SETTINGS_PATH)
    expect(settings.status).toBe(200)
    expect(await settings.json()).toMatchObject({
      settings: { skillsRepository: 'owner/skills' },
    })
    expect(fixture.github.requests).toHaveLength(calls)
  },
)

it('returns no list for no repository and not-found for invalid saved text without a GitHub call', async () => {
  const fixture = fixtureForTest()
  for (const repository of [
    '',
    'https://example.com/repo',
    'owner/../other',
    'owner/name?redirect=elsewhere',
  ]) {
    await fixture.env.DB.prepare(
      'UPDATE settings SET skills_repository = ? WHERE org_id = ?',
    )
      .bind(repository, OUTER_ORG)
      .run()
    const response = await fixture.request(SKILLS_LOOKUP_PATH)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      repository,
      skills: [],
      notice: repository ? 'not-found' : null,
      clashes: [],
    })
  }
  expect(fixture.github.requests).toEqual([])
})
