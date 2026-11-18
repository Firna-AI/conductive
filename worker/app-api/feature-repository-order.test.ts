import { afterEach, beforeAll, expect, it } from 'vitest'

import { readRepositories } from '../../src/app/api/read-settings'
import {
  orgSettingsPaths,
  repositoryPath,
  repositoryPositionPath,
} from '../../src/shared/org-settings'
import {
  createOuterRuntime,
  outerWorkerBundle,
  type OuterRuntime,
} from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_REPOSITORY,
} from '../chat/integration/outer-seed.test-support'
import { readBuildHistory } from '../lifecycle/build-data'
import { shellRepositoryId } from './feature-repositories-data'
import { shellGitHubCatalog } from './feature-shell.test-support'

let bundle: string
let fixture: OuterRuntime | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle()
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

/** The catalogue repository `owner/another-repository`, which no row holds yet. */
const CANDIDATE = shellRepositoryId(OUTER_ORG, 202)

/**
 * The outer org with `chat-repository` (`owner/repository`) chosen, and
 * the chosen repositories of `rows`, each with its position or `null`.
 */
async function setup(rows: readonly [string, string, number | null][]) {
  const active = (fixture = await createOuterRuntime(bundle))
  await shellGitHubCatalog(active)
  const db = active.env.DB
  for (const [index, [id, fullName, position]] of rows.entries())
    await db
      .prepare(
        `INSERT INTO repositories
         (id, org_id, github_repository_id, full_name, default_branch, installation_id, position)
         VALUES (?, ?, ?, ?, 'main', 91, ?)`,
      )
      .bind(id, OUTER_ORG, 300 + index, fullName, position)
      .run()
  const list = async (response?: { json(): Promise<unknown> }) => {
    const body = await (
      response ??
      (await active.request(orgSettingsPaths.repositories(OUTER_ORG)))
    ).json()
    return readRepositories(body).map(({ id, selected }) =>
      selected ? id : `${id} (not chosen)`,
    )
  }
  const positions = async () => {
    const { results } = await db
      .prepare(
        'SELECT id, position FROM repositories WHERE org_id = ? ORDER BY id',
      )
      .bind(OUTER_ORG)
      .all<{ id: string; position: number | null }>()
    return Object.fromEntries(results.map((row) => [row.id, row.position]))
  }
  const move = (id: string, body: unknown, cookie?: string) =>
    active.request(repositoryPositionPath(OUTER_ORG, id), {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: cookie === undefined ? undefined : { Cookie: cookie },
    })
  const choose = (id: string, selected: boolean) =>
    active.request(repositoryPath(OUTER_ORG, id), {
      method: selected ? 'PUT' : 'DELETE',
      body: '{}',
    })
  const state = async () => ({
    builds: (await readBuildHistory(db, OUTER_ORG)).builds.length,
    revision: await db
      .prepare('SELECT revision FROM settings WHERE org_id = ?')
      .bind(OUTER_ORG)
      .first('revision'),
  })
  return { active, list, positions, move, choose, state }
}

it('adds a repository at the end, gives a row without a position its place, and clears the place at a Remove', async () => {
  const { list, positions, move, choose } = await setup([
    ['zeta', 'owner/zeta', 0],
  ])
  expect(await list()).toEqual([
    'zeta',
    OUTER_REPOSITORY,
    `${CANDIDATE} (not chosen)`,
  ])
  expect(await list(await choose(CANDIDATE, true))).toEqual([
    'zeta',
    OUTER_REPOSITORY,
    CANDIDATE,
  ])
  expect(await positions()).toEqual({
    [OUTER_REPOSITORY]: 1,
    [CANDIDATE]: 2,
    zeta: 0,
  })
  expect((await move(CANDIDATE, { index: 0 })).status).toBe(200)
  expect(await list(await choose(CANDIDATE, false))).toEqual([
    'zeta',
    OUTER_REPOSITORY,
    `${CANDIDATE} (not chosen)`,
  ])
  expect((await positions())[CANDIDATE]).toBe(null)
  expect(await list(await choose(CANDIDATE, true))).toEqual([
    'zeta',
    OUTER_REPOSITORY,
    CANDIDATE,
  ])
  expect(await positions()).toEqual({
    [OUTER_REPOSITORY]: 1,
    [CANDIDATE]: 2,
    zeta: 0,
  })
})

it('moves a chosen repository for an admin without a build or a settings change', async () => {
  const { list, positions, move, state } = await setup([
    ['zeta', 'owner/zeta', 0],
    ['beta', 'owner/beta', 1],
  ])
  const before = await state()
  const moved = await move('beta', { index: 0 })
  expect(moved.status).toBe(200)
  expect(await moved.json()).toEqual({
    order: ['beta', 'zeta', OUTER_REPOSITORY],
  })
  expect(await list()).toEqual([
    'beta',
    'zeta',
    OUTER_REPOSITORY,
    `${CANDIDATE} (not chosen)`,
  ])
  expect(await positions()).toEqual({
    [OUTER_REPOSITORY]: 2,
    beta: 0,
    zeta: 1,
  })
  expect((await move('beta', { index: 9 })).status).toBe(200)
  expect(await list()).toEqual([
    'zeta',
    OUTER_REPOSITORY,
    'beta',
    `${CANDIDATE} (not chosen)`,
  ])
  await Promise.all([move('beta', { index: 0 }), move('zeta', { index: 2 })])
  expect(await list()).toEqual([
    'beta',
    OUTER_REPOSITORY,
    'zeta',
    `${CANDIDATE} (not chosen)`,
  ])
  expect(await state()).toEqual(before)
})

it('moves nothing for a member, for a repository that is not chosen, or for a body without an index', async () => {
  const { active, list, positions, move, choose } = await setup([
    ['zeta', 'owner/zeta', 0],
  ])
  expect((await choose(CANDIDATE, true)).status).toBe(200)
  expect((await choose(CANDIDATE, false)).status).toBe(200)
  const before = await positions()
  const denied = await move('zeta', { index: 1 }, active.cookies.memberCookie)
  expect(denied.status).toBe(403)
  expect(await denied.json()).toMatchObject({
    error: { code: 'admin_required' },
  })
  const removed = await move(CANDIDATE, { index: 0 })
  expect(removed.status).toBe(200)
  expect(await removed.json()).toEqual({ order: ['zeta', OUTER_REPOSITORY] })
  expect(await list()).toEqual([
    'zeta',
    OUTER_REPOSITORY,
    `${CANDIDATE} (not chosen)`,
  ])
  const invalid = await move('zeta', { index: 'last' })
  expect(invalid.status).toBe(400)
  expect(await invalid.json()).toMatchObject({
    error: { code: 'invalid_input' },
  })
  expect(await positions()).toEqual(before)
})

it('saves a move and answers with the saved order while GitHub fails, without a call to GitHub', async () => {
  const { active, list, move } = await setup([['zeta', 'owner/zeta', 0]])
  const github = active.github.fetch
  let calls = 0
  active.github.fetch = async () => {
    calls += 1
    return new Response('GitHub is down', { status: 502 })
  }
  const moved = await move(OUTER_REPOSITORY, { index: 0 })
  const answer = { status: moved.status, body: await moved.json(), calls }
  active.github.fetch = github
  expect(answer).toEqual({
    status: 200,
    body: { order: [OUTER_REPOSITORY, 'zeta'] },
    calls: 0,
  })
  expect(await list()).toEqual([
    OUTER_REPOSITORY,
    'zeta',
    `${CANDIDATE} (not chosen)`,
  ])
})
