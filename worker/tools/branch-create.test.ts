import { afterEach, beforeAll, expect, it } from 'vitest'

import { record, string } from '../chat/inputs'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  branchToolFixture,
  type BranchToolFixture,
} from './branch-create.test-support'

let bundle: string
let fixture: BranchToolFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

const cases = [
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
]

it.each(cases)(
  'creates with $input from $start and base $base as the turn sender',
  async ({ input, start, base, checks }) => {
    const h = (fixture = await branchToolFixture(bundle))
    const response = await h.create(input)
    expect(response.status).toBe(201)
    const created = record(await response.json())
    const id = string(record(created.workspace).id)
    expect(
      await h.env.DB.prepare(
        'SELECT start_branch AS startBranch, base_branch AS baseBranch FROM workspace_creation_plans WHERE workspace_id = ?',
      )
        .bind(id)
        .first(),
    ).toEqual({ startBranch: start, baseBranch: base })
    expect(
      h.github.requests.map((request) => request.headers.get('Authorization')),
    ).toEqual(Array(checks).fill('Bearer member-branch-token'))
  },
)

it('reports a missing branch without making a workspace', async () => {
  const h = (fixture = await branchToolFixture(bundle))
  const result = await h.create({ startBranch: 'gone' })
  expect(result.status).toBe(404)
  expect(await result.json()).toEqual({
    error: {
      code: 'branch_not_found',
      message: 'The branch `gone` is no longer on GitHub.',
    },
  })
  expect(
    await h.env.DB.prepare('SELECT COUNT(*) AS count FROM workspaces').first(
      'count',
    ),
  ).toBe(2)
  expect(h.boat.starts).toHaveLength(0)
})

it('replays the first branches before a new branch check', async () => {
  const h = (fixture = await branchToolFixture(bundle))
  const response = await h.create({
    startBranch: 'develop',
    baseBranch: 'release/next',
  })
  expect(response.status).toBe(201)
  const created = record(await response.json())
  const id = string(record(created.workspace).id)
  expect(
    await h.env.DB.prepare(
      'SELECT start_branch AS startBranch, base_branch AS baseBranch FROM workspace_creation_plans WHERE workspace_id = ?',
    )
      .bind(id)
      .first(),
  ).toEqual({ startBranch: 'develop', baseBranch: 'release/next' })
  const reads = h.github.requests.length
  h.github.branches.clear()
  await h.restart()
  const replayed = await h.invoke({
    startBranch: '',
    baseBranch: '*',
  })
  expect(replayed.status).toBe(201)
  expect(await replayed.json()).toMatchObject({
    workspace: {
      id,
      branch: record(created.workspace).branch,
    },
    sessionId: created.sessionId,
    sessionLink: created.sessionLink,
  })
  expect(
    await h.env.DB.prepare(
      'SELECT start_branch AS startBranch, base_branch AS baseBranch FROM workspace_creation_plans WHERE workspace_id = ?',
    )
      .bind(id)
      .first(),
  ).toEqual({ startBranch: 'develop', baseBranch: 'release/next' })
  expect(h.github.requests).toHaveLength(reads)
  expect(h.boat.starts).toHaveLength(1)
})
