import { afterEach, beforeAll, expect, it } from 'vitest'

import { items, nested, record } from '../../src/app/api/parse'
import { readSection } from '../../src/app/api/read-core'
import { readWorkspaces } from '../../src/app/api/read-workspaces'
import { sectionPath, sectionsPath } from '../../src/shared/sections'
import { workspacePath, workspacesPath } from '../../src/shared/workspaces'
import {
  createOuterRuntime,
  outerWorkerBundle,
  type OuterRuntime,
} from '../chat/integration/outer-runtime.test-support'
import {
  OTHER_WORKSPACE,
  OUTER_ORG,
  OUTER_SECTION,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { seedShellWorkspaceRuntime } from '../chat/integration/shell-api.test-support'
import { lastShellWorkspaceEvent } from './feature-shell.test-support'

let bundle: string
let fixture: OuterRuntime | undefined
const readSections = (value: unknown) =>
  items(record(value), 'sections', readSection)
beforeAll(async () => {
  bundle = await outerWorkerBundle()
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

it('persists section order and private collapse, moves a workspace, and returns deleted-section workspaces to General', async () => {
  fixture = await createOuterRuntime(bundle)
  await seedShellWorkspaceRuntime(fixture)
  await fixture.env.DB.prepare(
    `INSERT INTO sections (id, org_id, name, position, created_at)
     VALUES ('other-section', 'other-org', 'Foreign section', 0, 1)`,
  ).run()
  const created = await fixture.request(sectionsPath(OUTER_ORG), {
    method: 'POST',
    headers: { Cookie: fixture.cookies.memberCookie },
    body: JSON.stringify({ name: 'Review' }),
  })
  expect(created.status).toBe(201)
  const section = nested(record(await created.json()), 'section', readSection)
  expect(section).toMatchObject({
    orgId: OUTER_ORG,
    name: 'Review',
    position: 1,
    isDefault: false,
    collapsed: false,
  })
  const path = sectionPath(OUTER_ORG, section.id)
  const changed = await fixture.request(path, {
    method: 'PATCH',
    body: JSON.stringify({
      name: 'Ready for review',
      collapsed: true,
      position: 0,
    }),
  })
  expect(changed.status).toBe(200)
  expect(await changed.json()).toMatchObject({
    section: { name: 'Ready for review', collapsed: true, position: 0 },
  })
  const ownerSections = readSections(
    await (await fixture.request(sectionsPath(OUTER_ORG))).json(),
  )
  expect(
    ownerSections.map(({ id, position, collapsed }) => ({
      id,
      position,
      collapsed,
    })),
  ).toEqual([
    { id: section.id, position: 0, collapsed: true },
    { id: OUTER_SECTION, position: 1, collapsed: false },
  ])
  const memberSections = readSections(
    await (
      await fixture.request(sectionsPath(OUTER_ORG), {
        headers: { Cookie: fixture.cookies.memberCookie },
      })
    ).json(),
  )
  expect(memberSections[0]?.collapsed).toBe(false)
  const moved = await fixture.request(
    workspacePath(OUTER_ORG, OTHER_WORKSPACE),
    {
      method: 'PATCH',
      body: JSON.stringify({
        sectionId: OUTER_SECTION,
        position: 0,
        name: 'Review task',
      }),
    },
  )
  expect(moved.status).toBe(200)
  expect(await moved.json()).toMatchObject({
    workspace: {
      id: OTHER_WORKSPACE,
      name: 'Review task',
      sectionId: OUTER_SECTION,
    },
  })
  const ordered = readWorkspaces(
    await (await fixture.request(workspacesPath(OUTER_ORG))).json(),
  )
  expect(ordered.map(({ id }) => id)).toEqual([
    OTHER_WORKSPACE,
    OUTER_WORKSPACE,
  ])
  const intoSection = await fixture.request(
    workspacePath(OUTER_ORG, OUTER_WORKSPACE),
    {
      method: 'PATCH',
      body: JSON.stringify({ sectionId: section.id, position: 0 }),
    },
  )
  expect(intoSection.status).toBe(200)
  const secondMove = await fixture.request(
    workspacePath(OUTER_ORG, OTHER_WORKSPACE),
    {
      method: 'PATCH',
      body: JSON.stringify({ sectionId: section.id, position: 0 }),
    },
  )
  expect(secondMove.status).toBe(200)
  const crossOrg = await fixture.request(
    workspacePath(OUTER_ORG, OUTER_WORKSPACE),
    {
      method: 'PATCH',
      body: JSON.stringify({ sectionId: 'other-section', position: 0 }),
    },
  )
  expect(crossOrg.status).toBe(404)
  expect(await crossOrg.json()).toMatchObject({
    error: { code: 'section_not_found' },
  })
  const deleted = await fixture.request(path, { method: 'DELETE', body: '{}' })
  expect(deleted.status).toBe(204)
  const after = readWorkspaces(
    await (await fixture.request(workspacesPath(OUTER_ORG))).json(),
  )
  expect(after.map(({ id, sectionId }) => ({ id, sectionId }))).toEqual([
    { id: OTHER_WORKSPACE, sectionId: OUTER_SECTION },
    { id: OUTER_WORKSPACE, sectionId: OUTER_SECTION },
  ])
  expect(
    readSections(await (await fixture.request(sectionsPath(OUTER_ORG))).json()),
  ).toEqual([
    {
      id: OUTER_SECTION,
      orgId: OUTER_ORG,
      name: 'General',
      position: 0,
      isDefault: true,
      collapsed: false,
    },
  ])
  expect(
    await lastShellWorkspaceEvent(fixture, OUTER_ORG, OUTER_WORKSPACE),
  ).toMatchObject({
    type: 'workspace.updated',
    workspace: { id: OUTER_WORKSPACE, sectionId: OUTER_SECTION },
  })
  await fixture.env.DB.prepare(
    `UPDATE workspaces SET state = 'archived', archived_at = 1 WHERE id = ?`,
  )
    .bind(OUTER_WORKSPACE)
    .run()
  const archived = await fixture.request(
    workspacePath(OUTER_ORG, OUTER_WORKSPACE),
    {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Cannot rename this archive' }),
    },
  )
  expect(archived.status).toBe(409)
  expect(await archived.json()).toMatchObject({
    error: { code: 'workspace_archived' },
  })
  const outsider = await fixture.request(sectionsPath(OUTER_ORG), {
    method: 'POST',
    headers: { Cookie: fixture.cookies.outsiderCookie },
    body: JSON.stringify({ name: 'Hidden' }),
  })
  expect(outsider.status).toBe(404)
})
