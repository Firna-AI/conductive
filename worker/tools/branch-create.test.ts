import { afterEach, beforeAll, expect, it } from 'vitest'

import { record, string } from '../chat/inputs'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  branchToolFixture,
  type BranchAdapter,
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

for (const adapter of ['cli', 'mcp'] satisfies BranchAdapter[]) {
  it.each(cases)(
    `${adapter} creates with $input from $start and base $base as the turn sender`,
    async ({ input, start, base, checks }) => {
      const h = (fixture = await branchToolFixture(bundle))
      const created = await h.create(adapter, input)
      expect(created).toMatchObject({ ok: true })
      if (!created.ok) throw new Error('The create failed')
      const id = string(record(created.value.workspace).id)
      expect(
        await h.env.DB.prepare(
          'SELECT start_branch AS startBranch, base_branch AS baseBranch FROM workspace_creation_plans WHERE workspace_id = ?',
        )
          .bind(id)
          .first(),
      ).toEqual({ startBranch: start, baseBranch: base })
      expect(
        h.github.requests.map((request) =>
          request.headers.get('Authorization'),
        ),
      ).toEqual(Array(checks).fill('Bearer member-branch-token'))
    },
  )

  it(`${adapter} reports a missing branch without making a workspace`, async () => {
    const h = (fixture = await branchToolFixture(bundle))
    const result = await h.create(adapter, { startBranch: 'gone' })
    expect(result).toMatchObject(
      adapter === 'cli'
        ? {
            ok: false,
            message:
              'branch_not_found: The branch `gone` is no longer on GitHub.',
          }
        : {
            ok: false,
            content: [
              {
                type: 'text',
                text: 'branch_not_found: The branch `gone` is no longer on GitHub.',
              },
            ],
          },
    )
    expect(
      await h.env.DB.prepare('SELECT COUNT(*) AS count FROM workspaces').first(
        'count',
      ),
    ).toBe(2)
    expect(h.boat.starts).toHaveLength(0)
  })

  it(`${adapter} replays the first branches before a new branch check`, async () => {
    const h = (fixture = await branchToolFixture(bundle))
    const created = await h.create(adapter, {
      startBranch: 'develop',
      baseBranch: 'release/next',
    })
    expect(created).toMatchObject({ ok: true })
    if (!created.ok) throw new Error('The create failed')
    const id = string(record(created.value.workspace).id)
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
    const replayed = await h.invoke(adapter, {
      startBranch: '',
      baseBranch: '*',
    })
    expect(replayed).toMatchObject({
      ok: true,
      value: {
        workspace: {
          id,
          branch: record(created.value.workspace).branch,
        },
        sessionId: created.value.sessionId,
        sessionLink: created.value.sessionLink,
      },
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
}
