import { afterEach, beforeAll, expect, it } from 'vitest'

import { workspacePath } from '../../src/shared/workspaces'
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

let bundle: string
let fixture: OuterRuntime | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle()
})
afterEach(async () => {
  await fixture?.dispose()
})

it('keeps a nested row unchanged when the app requests a section or position move', async () => {
  const active = (fixture = await createOuterRuntime(bundle))
  await seedShellWorkspaceRuntime(active)
  await active.env.DB.batch([
    active.env.DB.prepare(
      "INSERT INTO sections (id, org_id, name, position, created_at) VALUES ('review', 'chat-org', 'Review', 1, 1)",
    ),
    active.env.DB.prepare(
      'UPDATE workspaces SET parent_workspace_id = ?, position = 5 WHERE id = ?',
    ).bind(OUTER_WORKSPACE, OTHER_WORKSPACE),
  ])
  for (const body of [{ sectionId: 'review', position: 0 }, { position: 0 }]) {
    const response = await active.request(
      workspacePath(OUTER_ORG, OTHER_WORKSPACE),
      { method: 'PATCH', body: JSON.stringify(body) },
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      workspace: {
        id: OTHER_WORKSPACE,
        sectionId: OUTER_SECTION,
        parentId: OUTER_WORKSPACE,
      },
    })
    expect(
      await active.env.DB.prepare(
        'SELECT section_id AS sectionId, position, updated_at AS updatedAt FROM workspaces WHERE id = ?',
      )
        .bind(OTHER_WORKSPACE)
        .first(),
    ).toEqual({ sectionId: OUTER_SECTION, position: 5, updatedAt: 1 })
  }
  const unknown = await active.request(
    workspacePath(OUTER_ORG, OTHER_WORKSPACE),
    { method: 'PATCH', body: JSON.stringify({ sectionId: 'unknown' }) },
  )
  expect(unknown.status).toBe(404)
  expect(await unknown.json()).toMatchObject({
    error: { code: 'section_not_found' },
  })
  const renamed = await active.request(
    workspacePath(OUTER_ORG, OTHER_WORKSPACE),
    {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Nested task' }),
    },
  )
  expect(renamed.status).toBe(200)
  expect(await renamed.json()).toMatchObject({
    workspace: {
      name: 'Nested task',
      sectionId: OUTER_SECTION,
      parentId: OUTER_WORKSPACE,
    },
  })
})
