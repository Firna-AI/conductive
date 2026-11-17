import { expect, it } from 'vitest'

import { placeWorkspaces } from '../../src/shared/workspace-tree'
import { readWorkspaceTree, workspaceTreeSql } from './feature-workspaces-data'
import { setupShellListTests } from './shell-list.test-support'
import { seedWorkspaceTree } from './workspace-tree.test-support'

const fixtureForTest = setupShellListTests()

it('selects nesting, descendants, section roots and Archive promotions like placeWorkspaces', async () => {
  const fixture = fixtureForTest()
  const { db, orgId, user, generalId, reviewId } = fixture
  await db.batch([
    db
      .prepare(
        `INSERT INTO orgs (id, name, creator_user_id, created_at)
         VALUES ('other-org', 'Other', ?, 1)`,
      )
      .bind(user.id),
    db.prepare(
      `INSERT INTO sections (id, org_id, name, position, created_at)
       VALUES ('unknown-section', 'other-org', 'Other', 0, 1)`,
    ),
  ])
  await seedWorkspaceTree(fixture, [
    { id: 'root', sectionId: generalId, position: 1 },
    { id: 'cross-section', sectionId: reviewId, position: 0, parentId: 'root' },
    {
      id: 'middle',
      sectionId: reviewId,
      position: -1,
      parentId: 'root',
      archived: true,
    },
    {
      id: 'under-middle',
      sectionId: reviewId,
      position: -2,
      parentId: 'middle',
    },
    {
      id: 'nested',
      sectionId: generalId,
      position: -3,
      parentId: 'under-middle',
    },
    { id: 'archived-root', sectionId: reviewId, position: 2, archived: true },
    {
      id: 'archived-bridge',
      sectionId: reviewId,
      position: 3,
      parentId: 'archived-root',
      archived: true,
    },
    {
      id: 'promoted',
      sectionId: reviewId,
      position: 4,
      parentId: 'archived-bridge',
    },
    {
      id: 'unknown',
      sectionId: 'unknown-section',
      position: 5,
      parentId: 'archived-root',
    },
    {
      id: 'unknown-child',
      sectionId: reviewId,
      position: 6,
      parentId: 'unknown',
    },
    { id: 'other-root', sectionId: reviewId, position: 7 },
  ])
  const { workspaces, sections } = await readWorkspaceTree(db, orgId)
  const rows = placeWorkspaces(workspaces, sections)
  const storedRows = placeWorkspaces(
    workspaces.map((workspace) => ({ ...workspace, state: 'ready' as const })),
    sections,
  )
  for (const workspace of workspaces) {
    const treeIds = new Set([workspace.id])
    for (const row of storedRows)
      if (row.parentId !== null && treeIds.has(row.parentId))
        treeIds.add(row.workspace.id)
    const promoted = placeWorkspaces(
      workspaces.map((row) =>
        row.id === workspace.id ? { ...row, state: 'ready' as const } : row,
      ),
      sections,
    ).filter(({ parentId }) => parentId === workspace.id)
    for (const section of sections) {
      const { results } = await db
        .prepare(
          `${workspaceTreeSql}
           SELECT 'nested' AS selection, id FROM tree_rows WHERE id = ?2 AND live
             AND id NOT IN (SELECT id FROM top_level)
           UNION ALL SELECT 'tree', id FROM subtree
           UNION ALL SELECT 'top-level', id FROM top_level WHERE shown_section_id = ?3
           UNION ALL SELECT 'promoted', id FROM promoted
           ORDER BY selection, id`,
        )
        .bind(orgId, workspace.id, section.id)
        .all<{ selection: string; id: string }>()
      const nested = rows.filter(
        (row) => row.workspace.id === workspace.id && row.parentId !== null,
      )
      const topLevel = rows.filter(
        (row) => row.sectionId === section.id && row.parentId === null,
      )
      const expected = [
        ...nested.map(({ workspace }) => ({
          selection: 'nested',
          id: workspace.id,
        })),
        ...[...treeIds].map((id) => ({ selection: 'tree', id })),
        ...topLevel.map(({ workspace }) => ({
          selection: 'top-level',
          id: workspace.id,
        })),
        ...promoted.map(({ workspace }) => ({
          selection: 'promoted',
          id: workspace.id,
        })),
      ].sort(
        (a, b) =>
          a.selection.localeCompare(b.selection) || a.id.localeCompare(b.id),
      )
      expect(results, `${workspace.id} in ${section.id}`).toEqual(expected)
    }
  }
})
