import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { setupShellListTests } from './shell-list.test-support'
import { writeWorkspaceParentChange } from './workspace-parent-change-data'
import {
  seedWorkspaceTree,
  storedTreePlaces,
  workspacePlaces,
} from './workspace-tree.test-support'

const fixtureForTest = setupShellListTests()

it('moves live and archived descendants to the shown parent section in creation order and keeps the creator', async () => {
  const fixture = fixtureForTest()
  const { db, orgId, user, generalId, reviewId, laterId } = fixture
  await seedWorkspaceTree(fixture, [
    { id: 'moving', sectionId: generalId, position: 0 },
    { id: 'target', sectionId: reviewId, position: 2 },
    { id: 'sibling', sectionId: reviewId, position: -5, parentId: 'target' },
    {
      id: 'archived',
      sectionId: laterId,
      position: -4,
      parentId: 'moving',
      archived: true,
    },
    { id: 'child', sectionId: generalId, position: -3, parentId: 'archived' },
  ])
  await db
    .prepare(
      "UPDATE workspaces SET created_by_workspace_id = 'sibling' WHERE id = 'moving'",
    )
    .run()
  const result = await writeWorkspaceParentChange(db, {
    orgId,
    userId: user.id,
    workspaceId: 'moving',
    sectionId: laterId,
    target: { kind: 'parent', id: 'target' },
    now: TEST_TIME + 200,
  })
  expect(result).toEqual({
    updated: true,
    workspaceIds: ['moving', 'archived', 'child'],
  })
  expect(await workspacePlaces(fixture)).toEqual([
    ['target', reviewId, null],
    ['moving', reviewId, 'target'],
    ['child', reviewId, 'moving'],
    ['sibling', reviewId, 'target'],
  ])
  expect(
    (await storedTreePlaces(fixture)).map(({ id, sectionId }) => [
      id,
      sectionId,
    ]),
  ).toEqual([
    ['moving', reviewId],
    ['target', reviewId],
    ['sibling', reviewId],
    ['archived', reviewId],
    ['child', reviewId],
  ])
  expect(
    await db
      .prepare(
        "SELECT created_by_workspace_id AS creator FROM workspaces WHERE id = 'moving'",
      )
      .first(),
  ).toEqual({ creator: 'sibling' })
})

it('takes a nested tree to the top of its shown or named section and preserves a no-op place', async () => {
  const fixture = fixtureForTest()
  const { db, orgId, user, generalId, reviewId } = fixture
  await seedWorkspaceTree(fixture, [
    { id: 'before', sectionId: reviewId, position: 0 },
    { id: 'parent', sectionId: reviewId, position: 2 },
    { id: 'moving', sectionId: generalId, position: 8, parentId: 'parent' },
    { id: 'child', sectionId: generalId, position: 9, parentId: 'moving' },
  ])
  const input = {
    orgId,
    userId: user.id,
    workspaceId: 'moving',
    now: TEST_TIME + 200,
  }
  const before = await storedTreePlaces(fixture)
  expect(
    await writeWorkspaceParentChange(db, {
      ...input,
      target: { kind: 'parent', id: 'parent' },
    }),
  ).toEqual({ updated: true, workspaceIds: [] })
  expect(await storedTreePlaces(fixture)).toEqual(before)
  await writeWorkspaceParentChange(db, {
    ...input,
    target: { kind: 'top-level' },
  })
  expect(await workspacePlaces(fixture)).toEqual([
    ['moving', reviewId, null],
    ['child', reviewId, 'moving'],
    ['before', reviewId, null],
    ['parent', reviewId, null],
  ])
  const detached = await storedTreePlaces(fixture)
  expect(
    await writeWorkspaceParentChange(db, {
      ...input,
      target: { kind: 'top-level' },
    }),
  ).toEqual({ updated: true, workspaceIds: [] })
  expect(await storedTreePlaces(fixture)).toEqual(detached)
  await writeWorkspaceParentChange(db, {
    ...input,
    sectionId: generalId,
    target: { kind: 'top-level' },
  })
  expect(await workspacePlaces(fixture)).toEqual([
    ['moving', generalId, null],
    ['child', generalId, 'moving'],
    ['before', reviewId, null],
    ['parent', reviewId, null],
  ])
})

it('accepts an archived parent and follows its live ancestor section', async () => {
  const fixture = fixtureForTest()
  const { db, orgId, user, generalId, reviewId } = fixture
  await seedWorkspaceTree(fixture, [
    { id: 'root', sectionId: reviewId, position: 0 },
    {
      id: 'target',
      sectionId: generalId,
      position: 1,
      parentId: 'root',
      archived: true,
    },
    { id: 'moving', sectionId: generalId, position: 2 },
  ])
  await writeWorkspaceParentChange(db, {
    orgId,
    userId: user.id,
    workspaceId: 'moving',
    target: { kind: 'parent', id: 'target' },
    now: TEST_TIME + 200,
  })
  expect(await workspacePlaces(fixture)).toEqual([
    ['root', reviewId, null],
    ['moving', reviewId, 'root'],
  ])
  expect(
    (await storedTreePlaces(fixture)).find(({ id }) => id === 'moving'),
  ).toEqual({
    id: 'moving',
    sectionId: reviewId,
    parentId: 'target',
    position: 2,
  })
})
