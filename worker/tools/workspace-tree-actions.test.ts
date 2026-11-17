import { afterEach, beforeAll, expect, it } from 'vitest'

import { agentWorkspacePaths } from '../../src/shared/agent-workspaces'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OTHER_WORKSPACE,
  OUTER_ORG,
  OUTER_SECTION,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { record } from '../chat/inputs'
import {
  agentWriteFixture,
  type AgentWriteFixture,
} from '../features/agent-session-writes.test-support'
import { lastShellWorkspaceEvent } from '../app-api/feature-shell.test-support'

let bundle: string
let fixture: AgentWriteFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
afterEach(async () => {
  await fixture?.dispose()
})

it('names the shown top-level row when a nested tool move does nothing and moves the tree from that row', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  await active.env.DB.batch([
    active.env.DB.prepare(
      "INSERT INTO sections (id, org_id, name, position, created_at) VALUES ('review', 'chat-org', 'Review', 1, 1)",
    ),
    active.env.DB.prepare(
      `INSERT INTO workspaces (id, org_id, repository_id, owner_user_id, section_id, name, branch, state, created_at, updated_at, archived_at, parent_workspace_id)
      VALUES ('middle', 'chat-org', 'chat-repository', 'owner', 'chat-section', 'Middle', 'owner/middle', 'archived', 2, 2, 2, ?)`,
    ).bind(OUTER_WORKSPACE),
    active.env.DB
      .prepare(`INSERT INTO workspace_runtime (workspace_id, org_id, created_by_user_id, session_id, first_turn_id, agent, model, effort, first_message_id)
      VALUES ('middle', 'chat-org', 'owner', 'middle-session', 'middle-turn', 'claude', 'test-claude', 'high', 'middle-message')`),
    active.env.DB.prepare(
      "UPDATE workspaces SET parent_workspace_id = 'middle', position = 5 WHERE id = ?",
    ).bind(OTHER_WORKSPACE),
  ])
  const nested = await active.post(agentWorkspacePaths.move(OTHER_WORKSPACE), {
    sectionId: 'review',
  })
  expect(nested.status).toBe(200)
  expect(await nested.json()).toMatchObject({
    workspace: {
      id: OTHER_WORKSPACE,
      section: { id: OUTER_SECTION, name: 'General' },
    },
    notice: 'Move W-1 to move this workspace.',
  })
  expect(
    await active.env.DB.prepare(
      'SELECT section_id AS sectionId, position, updated_at AS updatedAt FROM workspaces WHERE id = ?',
    )
      .bind(OTHER_WORKSPACE)
      .first(),
  ).toEqual({ sectionId: OUTER_SECTION, position: 5, updatedAt: 1 })
  const unknown = await active.post(agentWorkspacePaths.move(OTHER_WORKSPACE), {
    sectionId: 'unknown',
  })
  expect(unknown.status).toBe(404)
  expect(await unknown.json()).toMatchObject({
    error: { code: 'section_not_found' },
  })
  const moved = await active.post(agentWorkspacePaths.move(), {
    sectionId: 'review',
  })
  expect(moved.status).toBe(200)
  expect(record(await moved.json())).not.toHaveProperty('notice')
  const { results } = await active.env.DB.prepare(
    'SELECT id, section_id AS sectionId FROM workspaces WHERE org_id = ? ORDER BY number',
  )
    .bind(OUTER_ORG)
    .all<{ id: string; sectionId: string }>()
  expect(results).toEqual([
    { id: OUTER_WORKSPACE, sectionId: 'review' },
    { id: OTHER_WORKSPACE, sectionId: 'review' },
    { id: 'middle', sectionId: 'review' },
  ])
  expect(
    await lastShellWorkspaceEvent(active, OUTER_ORG, OTHER_WORKSPACE),
  ).toMatchObject({
    type: 'workspace.updated',
    workspace: { id: OTHER_WORKSPACE, sectionId: 'review' },
  })
})
