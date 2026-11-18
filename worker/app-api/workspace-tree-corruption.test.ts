import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { toolWorkspaceDetail } from '../tools/workspace-data'
import { workspaceParent } from '../tools/workspace-parent-data'
import {
  readWorkspaceMove,
  readWorkspaceTree,
  workspaceTreeSql,
} from './feature-workspaces-data'
import { setupShellListTests } from './shell-list.test-support'
import { seedWorkspaceTree } from './workspace-tree.test-support'

const fixtureForTest = setupShellListTests()

it('stops each reader at an already seen workspace in corrupt parent rows', async () => {
  const fixture = fixtureForTest()
  const { db, orgId, generalId } = fixture
  await seedWorkspaceTree(fixture, [
    { id: 'one', sectionId: generalId, position: 0, archived: true },
    {
      id: 'two',
      sectionId: generalId,
      position: 1,
      parentId: 'one',
      archived: true,
    },
    { id: 'live', sectionId: generalId, position: 2, parentId: 'two' },
  ])
  await db
    .prepare(
      "UPDATE workspaces SET parent_workspace_id = 'two' WHERE id = 'one'",
    )
    .run()
  expect(
    (await readWorkspaceTree(db, orgId)).rows.map(
      ({ workspace }) => workspace.id,
    ),
  ).toEqual(['live'])
  expect(await readWorkspaceMove(db, orgId, 'live')).toMatchObject({
    nested: false,
    root: { id: 'live' },
  })
  expect(await workspaceParent(db, orgId, 'live')).toEqual({
    number: 3,
    parentId: 'two',
    depth: 2,
  })
  expect(
    await toolWorkspaceDetail(
      db,
      orgId,
      'live',
      'https://conductive.build',
      TEST_TIME,
    ),
  ).toMatchObject({ depth: 2 })
  const result = await db
    .prepare(`${workspaceTreeSql} SELECT id FROM subtree ORDER BY id`)
    .bind(orgId, 'one')
    .all<{ id: string }>()
  expect(result.results).toEqual([{ id: 'live' }, { id: 'one' }, { id: 'two' }])
})
