import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from 'vitest'

import { settleWorkspaceBranch } from '../lifecycle/workspace-branch'
import { createHarness, type TestHarness } from '../test-support/harness'
import { WORKSPACE_ID } from './harness.test-support'
import type { TitleModelCall } from './title-model'
import { createTitleFixture } from './workspace-title.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterEach(() => {
  vi.restoreAllMocks()
})
afterAll(async () => {
  await harness.dispose()
})

it.each([
  { settled: false, branch: 'owner/fix-chat-titles-ab12' },
  { settled: true, branch: 'owner/riga-ab12' },
])(
  'gives the title to the branch only before the start uses it (settled: $settled)',
  async ({ settled, branch }) => {
    const run = vi
      .fn<TitleModelCall>()
      .mockResolvedValue({ response: 'Fix chat titles' })
    const { fixture, acceptFirst, drain } = await createTitleFixture(
      harness,
      run,
    )
    const db = fixture.env.DB
    await db
      .prepare(
        'UPDATE workspaces SET branch = ?, branch_placeholder = 1 WHERE id = ?',
      )
      .bind('owner/riga-ab12', WORKSPACE_ID)
      .run()
    if (settled)
      expect(await settleWorkspaceBranch(db, WORKSPACE_ID)).toBe(
        'owner/riga-ab12',
      )
    await acceptFirst()
    await drain()
    expect(
      await db
        .prepare('SELECT name, branch FROM workspaces WHERE id = ?')
        .bind(WORKSPACE_ID)
        .first(),
    ).toEqual({ name: 'Fix chat titles', branch })
    const updates = (
      await fixture.chat.readWorkspace(WORKSPACE_ID, (view) => view.history(0))
    ).events.flatMap(({ event }) =>
      event.type === 'workspace.updated' ? [event.workspace.branch] : [],
    )
    // Open tabs learn only a branch that took the title.
    expect(updates).toEqual(settled ? [] : [branch])
    // A settled branch gives null, because no name write changes it again.
    expect(await settleWorkspaceBranch(db, WORKSPACE_ID)).toBe(
      settled ? null : branch,
    )
  },
)
