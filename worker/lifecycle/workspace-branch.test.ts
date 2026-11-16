import { expect, it } from 'vitest'

import { updateShellWorkspace } from '../app-api/feature-workspaces-data'
import {
  seedListWorkspaces,
  setupShellListTests,
} from '../app-api/shell-list.test-support'
import { TEST_TIME } from '../test-support/harness'
import {
  branchNamePart,
  settleWorkspaceBranch,
  workspaceBranch,
} from './workspace-branch'

const fixtureForTest = setupShellListTests()

it.each([
  ['Saved carts', 'saved-carts'],
  ['  Fix: the café/menu bug!  ', 'fix-the-cafe-menu-bug'],
  ['Écrire la Ñ en UTF-8', 'ecrire-la-n-en-utf-8'],
  ['日本語', ''],
  ['', ''],
  [null, ''],
  // 40 characters end at the last hyphen within the limit.
  [
    'Validate UK postcodes before the address lookup runs',
    'validate-uk-postcodes-before-the-address',
  ],
  ['a'.repeat(45), 'a'.repeat(40)],
])('gives the branch name part of %j', (name, part) => {
  expect(branchNamePart(name)).toBe(part)
})

it('names a branch from a name, a city, and a task', async () => {
  const random = () => 'fixed-token'
  const { city, branch } = await workspaceBranch('owner', random)
  expect(branch).toMatch(new RegExp(`^owner/${city}-[a-z0-9]{4}$`))
  const suffix = branch.slice(-5)
  expect(
    (await workspaceBranch('owner', random, { name: 'Saved carts' })).branch,
  ).toBe(`owner/saved-carts${suffix}`)
  expect(
    (await workspaceBranch('owner', random, { name: 'Saved carts', task: 2 }))
      .branch,
  ).toBe(`owner/saved-carts-v2${suffix}`)
  expect(
    (await workspaceBranch('owner', random, { name: '日本語', task: 3 }))
      .branch,
  ).toBe(`owner/${city}-v3${suffix}`)
})

it('renames a placeholder branch with Rename until the start settles it', async () => {
  const fixture = fixtureForTest()
  const { db, orgId, user, generalId } = fixture
  await seedListWorkspaces(fixture, [
    { id: 'w', sectionId: generalId, position: 0 },
  ])
  await db
    .prepare(
      `UPDATE workspaces SET branch = 'list-owner/oslo-k2q7', branch_placeholder = 1
       WHERE id = 'w'`,
    )
    .run()
  const rename = async (name: string | undefined, now: number) => {
    const result = await updateShellWorkspace(db, {
      orgId,
      userId: user.id,
      workspaceId: 'w',
      name,
      sectionId: name === undefined ? generalId : undefined,
      now,
    })
    return result.updated
  }
  const branch = () =>
    db.prepare("SELECT branch FROM workspaces WHERE id = 'w'").first('branch')
  expect(await rename('Saved carts', TEST_TIME + 1)).toBe(true)
  expect(await branch()).toBe('list-owner/saved-carts-k2q7')
  // A move keeps the branch. A name without a letter or a digit puts back
  // the city of the creation plan, and this row has no plan, so the branch
  // stays. workspace-branch-start.test.ts checks the city with a real create.
  expect(await rename(undefined, TEST_TIME + 2)).toBe(true)
  expect(await rename('…', TEST_TIME + 3)).toBe(true)
  expect(await branch()).toBe('list-owner/saved-carts-k2q7')
  expect(await rename('Checkout fix', TEST_TIME + 4)).toBe(true)
  expect(await settleWorkspaceBranch(db, 'w')).toBe(
    'list-owner/checkout-fix-k2q7',
  )
  expect(await rename('Later name', TEST_TIME + 5)).toBe(true)
  expect(await branch()).toBe('list-owner/checkout-fix-k2q7')
})

it('keeps the branch of a workspace from before the placeholder', async () => {
  const fixture = fixtureForTest()
  const { db, orgId, user, generalId } = fixture
  await seedListWorkspaces(fixture, [
    { id: 'old', sectionId: generalId, position: 0 },
  ])
  await updateShellWorkspace(db, {
    orgId,
    userId: user.id,
    workspaceId: 'old',
    name: 'New name',
    now: TEST_TIME + 1,
  })
  expect(
    await db
      .prepare("SELECT name, branch FROM workspaces WHERE id = 'old'")
      .first(),
  ).toEqual({ name: 'New name', branch: 'list-owner/old' })
})
