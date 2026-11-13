import { expect, it } from 'vitest'

import { record, string } from '../chat/inputs'
import { setupBackendTests } from './backend-test-hooks'
import { FIRST_MESSAGE } from './durable-test-support'
import { browserBranchCreate, branchGitHub } from './start-branch.test-support'
import { createWorkspace } from './workspaces'

const backend = setupBackendTests()

it.each([
  { input: {}, start: 'main', base: null, checks: 0 },
  {
    input: { startBranch: 'develop' },
    start: 'develop',
    base: 'develop',
    checks: 1,
  },
  {
    input: { baseBranch: 'develop' },
    start: 'develop',
    base: 'develop',
    checks: 1,
  },
  {
    input: { startBranch: 'develop', baseBranch: 'main' },
    start: 'develop',
    base: null,
    checks: 1,
  },
  {
    input: { startBranch: 'main', baseBranch: 'release/next' },
    start: 'main',
    base: 'release/next',
    checks: 1,
  },
  {
    input: { startBranch: 'develop', baseBranch: 'release/next' },
    start: 'develop',
    base: 'release/next',
    checks: 2,
  },
  {
    input: { startBranch: 'main', baseBranch: 'main' },
    start: 'main',
    base: null,
    checks: 0,
  },
])(
  'creates with $input from $start and stores base $base',
  async ({ input, start, base, checks }) => {
    const h = backend()
    const api = await branchGitHub(h)
    const response = await browserBranchCreate(h, input)
    expect(response?.status).toBe(201)
    const value = record(await response!.json())
    const id = string(record(value.workspace).id)
    expect(
      await h.runtime.env.DB.prepare(
        'SELECT start_branch AS startBranch, base_branch AS baseBranch FROM workspace_creation_plans WHERE workspace_id = ?',
      )
        .bind(id)
        .first(),
    ).toEqual({ startBranch: start, baseBranch: base })
    expect(
      await h.runtime.env.DB.prepare(
        'SELECT base_branch FROM workspaces WHERE id = ?',
      )
        .bind(id)
        .first('base_branch'),
    ).toBe(base)
    expect(h.starts.get(id)?.lastAccepted()).toMatchObject({
      startBranch: start,
      baseBranch: base ?? undefined,
    })
    expect(
      api.requests.map((request) => request.headers.get('Authorization')),
    ).toEqual(Array(checks).fill('Bearer create-sender-token'))
  },
)

it('refuses each missing non-default branch before a workspace is made', async () => {
  const h = backend()
  const api = await branchGitHub(h)
  for (const input of [
    { startBranch: 'missing' },
    { startBranch: 'develop', baseBranch: 'missing' },
  ]) {
    await expect(browserBranchCreate(h, input)).rejects.toMatchObject({
      status: 404,
      code: 'branch_not_found',
      message: 'The branch `missing` is no longer on GitHub.',
    })
  }
  api.deniedTokens.add('create-sender-token')
  await expect(
    browserBranchCreate(h, { startBranch: 'develop' }),
  ).rejects.toMatchObject({ status: 403, code: 'github_access_required' })
  expect(
    await h.runtime.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM workspace_creation_attempts',
    ).first('count'),
  ).toBe(0)
  expect(h.boat.starts).toHaveLength(0)
})

it('refuses invalid Git branch names without reading GitHub or starting a workspace', async () => {
  const h = backend()
  const api = await branchGitHub(h)
  for (const name of [
    '',
    '*',
    'release..next',
    '../outside',
    'feature.lock',
    '-option',
    'bad\nname',
    'refs//head',
    'HEAD',
    'a@{b',
    'a:b',
    'a\\b',
    'a b',
    '.hidden',
    'feature/',
  ]) {
    for (const field of ['startBranch', 'baseBranch']) {
      await expect(
        browserBranchCreate(h, { [field]: name }),
      ).rejects.toMatchObject({ status: 400, code: 'invalid_input' })
    }
  }
  expect(api.requests).toHaveLength(0)
  expect(h.boat.starts).toHaveLength(0)
})

it.each(['unavailable', 'expired'] as const)(
  'keeps creating when GitHub is %s',
  async (kind) => {
    const h = backend()
    const api = await branchGitHub(h)
    if (kind === 'expired')
      await h.runtime.env.DB.prepare(
        'DELETE FROM github_connections WHERE user_id = ?',
      )
        .bind(h.user.id)
        .run()
    else
      api.failure = Response.json(
        { detail: 'private failure' },
        { status: 503 },
      )
    const response = await browserBranchCreate(h, {
      startBranch: 'develop',
      baseBranch: 'release/next',
    })
    expect(response?.status).toBe(201)
    const id = string(record(record(await response!.json()).workspace).id)
    expect(h.starts.get(id)?.lastAccepted()).toMatchObject({
      startBranch: 'develop',
      baseBranch: 'release/next',
    })
  },
)

it('replays a pending or admitted first message before checking the new branch fields', async () => {
  const h = backend()
  const api = await branchGitHub(h)
  const input = {
    repositoryId: h.repositoryId,
    firstMessage: FIRST_MESSAGE,
    startBranch: 'develop',
    baseBranch: 'release/next',
  }
  const workspace = h.runtime.workspace
  h.runtime.workspace = () => {
    throw new Error('Lost create handoff')
  }
  await expect(
    createWorkspace(h.runtime, h.org.id, h.user, input),
  ).rejects.toThrow('Lost create handoff')
  h.runtime.workspace = workspace
  const reads = api.requests.length
  api.branches.clear()
  const replay = await browserBranchCreate(h, {
    startBranch: '*',
    baseBranch: 'gone',
  })
  expect(replay?.status).toBe(201)
  expect(api.requests).toHaveLength(reads)
  const admitted = record(await replay!.json())
  const id = string(record(admitted.workspace).id)
  expect(h.starts.get(id)?.lastAccepted()).toMatchObject({
    startBranch: 'develop',
    baseBranch: 'release/next',
  })
  expect(
    await (await browserBranchCreate(h, { startBranch: 'gone' }))!.json(),
  ).toEqual(admitted)
  expect(api.requests).toHaveLength(reads)
})
