import { afterEach, beforeAll, expect, it } from 'vitest'

import { agentWorkspacePaths } from '../../src/shared/agent-workspaces'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OTHER_WORKSPACE,
  OUTER_ORG,
  OUTER_SECTION,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
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

it('nests a whole tree in its parent section, publishes each row, and takes it out again', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  await active.env.DB.batch([
    active.env.DB.prepare(
      "INSERT INTO sections (id, org_id, name, position, created_at) VALUES ('review', 'chat-org', 'Review', 1, 1)",
    ),
    active.env.DB.prepare(
      "UPDATE workspaces SET section_id = 'review' WHERE id = ?",
    ).bind(OTHER_WORKSPACE),
    active.env.DB.prepare(
      `INSERT INTO workspaces (id, org_id, repository_id, owner_user_id, section_id, name, branch, state, created_at, updated_at, archived_at, parent_workspace_id)
       VALUES ('child', 'chat-org', 'chat-repository', 'owner', 'chat-section', 'Child', 'owner/child', 'archived', 2, 2, 2, ?)`,
    ).bind(OUTER_WORKSPACE),
    active.env.DB.prepare(
      `INSERT INTO workspace_runtime (workspace_id, org_id, created_by_user_id, session_id, first_turn_id, agent, model, effort, first_message_id)
       VALUES ('child', 'chat-org', 'owner', 'child-session', 'child-turn', 'claude', 'test-claude', 'high', 'child-message')`,
    ),
  ])
  const nested = await active.post(agentWorkspacePaths.move(), {
    parentId: OTHER_WORKSPACE,
    sectionId: OUTER_SECTION,
  })
  expect(nested.status).toBe(200)
  expect(await nested.json()).toMatchObject({
    workspace: {
      id: OUTER_WORKSPACE,
      parent: { id: OTHER_WORKSPACE },
      depth: 1,
      section: { id: 'review' },
    },
    notice: 'The workspace joined the section of its parent.',
  })
  for (const id of [OUTER_WORKSPACE, 'child'])
    expect(await lastShellWorkspaceEvent(active, OUTER_ORG, id)).toMatchObject({
      type: 'workspace.updated',
      workspace: {
        id,
        sectionId: 'review',
        parentId: id === 'child' ? OUTER_WORKSPACE : OTHER_WORKSPACE,
      },
    })
  const detached = await active.post(agentWorkspacePaths.move(), {
    topLevel: true,
  })
  expect(detached.status).toBe(200)
  expect(await detached.json()).toMatchObject({
    workspace: { parent: null, depth: 0, section: { id: 'review' } },
  })
})

it('rejects malformed targets and preserves the section-only input rules', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  for (const body of [
    { parentId: OTHER_WORKSPACE, topLevel: true },
    { parentId: null, sectionId: OUTER_SECTION },
    { topLevel: 'true', sectionId: OUTER_SECTION },
    {},
    { topLevel: false },
  ]) {
    const response = await active.post(agentWorkspacePaths.move(), body)
    expect(response.status, JSON.stringify(body)).toBe(400)
    expect(await response.json()).toMatchObject({
      error: { code: 'invalid_input' },
    })
  }
  const sectionOnly = await active.post(agentWorkspacePaths.move(), {
    sectionId: OUTER_SECTION,
    topLevel: false,
  })
  expect(sectionOnly.status).toBe(200)
})
