import { afterEach, beforeAll, expect, it } from 'vitest'

import {
  agentWorkspacePath,
  agentWorkspacePaths,
} from '../../src/shared/agent-workspaces'
import { WORKSPACE_RESTORE_MS } from '../../src/shared/workspaces'
import {
  outerWorkerBundle,
  OUTER_MACHINE_ORIGIN,
} from '../chat/integration/outer-runtime.test-support'
import {
  OTHER_WORKSPACE,
  OUTER_WORKSPACE,
  OUTER_TOKEN,
} from '../chat/integration/outer-seed.test-support'
import { record } from '../chat/inputs'
import { chatKey } from '../chat/storage-keys'
import {
  agentWriteFixture,
  type AgentWriteFixture,
} from '../features/agent-session-writes.test-support'

let bundle: string
let fixture: AgentWriteFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
afterEach(async () => {
  await fixture?.dispose()
})

function get(active: AgentWriteFixture, workspaceId?: string) {
  return active.runtime.dispatchFetch(
    `${OUTER_MACHINE_ORIGIN}${agentWorkspacePath(workspaceId)}`,
    {
      headers: { Authorization: `Bearer ${OUTER_TOKEN}` },
    },
  )
}

it('keeps a sender rename over automatic naming and refuses stale or archived writes', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  await active.env.DB.prepare("UPDATE workspaces SET name = '' WHERE id = ?")
    .bind(OUTER_WORKSPACE)
    .run()
  const response = await active.post(agentWorkspacePaths.rename(), {
    name: '  Fix_my   workspace.\nOther text',
    senderUserId: 'outsider',
  })
  expect(response.status).toBe(200)
  expect(record(await response.json()).workspace).toMatchObject({
    name: 'Fix_my workspace',
    branch: 'owner/workspace-one',
  })
  active.sourceRunner.emit({ type: 'workspace.title', name: 'Automatic title' })
  await active.sourceRunner.inbox.next()
  expect(
    await active.env.DB.prepare('SELECT name FROM workspaces WHERE id = ?')
      .bind(OUTER_WORKSPACE)
      .first('name'),
  ).toBe('Fix_my workspace')
  for (const turn of [null, 'stale-turn']) {
    const denied = await active.post(
      agentWorkspacePaths.rename(),
      { name: 'Other' },
      turn,
    )
    expect(denied.status).toBe(403)
    expect(await denied.json()).toMatchObject({
      error: { code: 'calling_turn_required' },
    })
  }
  const blank = await active.post(agentWorkspacePaths.rename(), { name: '  ' })
  expect(blank.status).toBe(400)
  expect(await blank.json()).toMatchObject({ error: { code: 'invalid_input' } })
  await active.env.DB.prepare(
    'UPDATE workspaces SET archived_at = 1 WHERE id = ?',
  )
    .bind(OTHER_WORKSPACE)
    .run()
  const archived = await active.post(
    agentWorkspacePaths.rename(OTHER_WORKSPACE),
    { name: 'Other' },
  )
  expect(archived.status).toBe(409)
  expect(await archived.json()).toMatchObject({
    error: { code: 'workspace_archived' },
  })
})

it('moves to a section top and keeps an existing section move unchanged', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  await active.env.DB.prepare(
    "INSERT INTO sections (id, org_id, name, position, is_default, created_at) VALUES ('review', 'chat-org', 'Review', 1, 0, 1), ('foreign', 'other-org', 'Private', 0, 1, 1)",
  ).run()
  for (const id of [OUTER_WORKSPACE, OTHER_WORKSPACE]) {
    const response = await active.post(agentWorkspacePaths.move(id), {
      sectionId: 'review',
    })
    expect(response.status).toBe(200)
    expect(record(record(await response.json()).workspace).section).toEqual({
      id: 'review',
      name: 'Review',
    })
  }
  const repeated = await active.post(agentWorkspacePaths.move(), {
    sectionId: 'review',
  })
  expect(repeated.status).toBe(200)
  const rows = await active.env.DB.prepare(
    "SELECT id FROM workspaces WHERE section_id = 'review' ORDER BY position, created_at, id",
  ).all<{ id: string }>()
  expect(rows.results.map(({ id }) => id)).toEqual([
    OTHER_WORKSPACE,
    OUTER_WORKSPACE,
  ])
  for (const sectionId of ['unknown', 'foreign']) {
    const denied = await active.post(agentWorkspacePaths.move(), { sectionId })
    expect(denied.status).toBe(404)
    expect(await denied.json()).toMatchObject({
      error: { code: 'section_not_found' },
    })
  }
  await active.env.DB.prepare(
    'UPDATE workspaces SET archived_at = 1 WHERE id = ?',
  )
    .bind(OTHER_WORKSPACE)
    .run()
  const archived = await active.post(
    agentWorkspacePaths.move(OTHER_WORKSPACE),
    { sectionId: 'chat-section' },
  )
  expect(archived.status).toBe(409)
  expect(await archived.json()).toMatchObject({
    error: { code: 'workspace_archived' },
  })
})

it('uses the stored sender archive rights and can stop and revoke its own workspace', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  const denied = await active.post(
    agentWorkspacePaths.archive(OTHER_WORKSPACE),
    { senderUserId: 'owner' },
  )
  expect(denied.status).toBe(403)
  expect(await denied.json()).toMatchObject({
    error: { code: 'archive_forbidden' },
  })
  expect(
    await active.env.DB.prepare(
      'SELECT archived_at FROM workspaces WHERE id = ?',
    )
      .bind(OTHER_WORKSPACE)
      .first('archived_at'),
  ).toBeNull()
  await active.env.DB.prepare(
    "UPDATE org_members SET role = 'admin' WHERE user_id = 'member' AND org_id = 'chat-org'",
  ).run()
  const admin = await active.post(
    agentWorkspacePaths.archive(OTHER_WORKSPACE),
    {},
  )
  expect(admin.status).toBe(200)
  const archived = record(record(await admin.json()).workspace)
  expect(archived.state).toBe('archived')
  expect(
    await (
      await active.post(agentWorkspacePaths.archive(OTHER_WORKSPACE), {})
    ).json(),
  ).toEqual({ workspace: archived })
  await active.env.DB.batch([
    active.env.DB.prepare(
      "UPDATE org_members SET role = 'member' WHERE user_id = 'member' AND org_id = 'chat-org'",
    ),
    active.env.DB.prepare(
      "UPDATE workspaces SET owner_user_id = 'member', sandbox_id = 'calling-computer' WHERE id = ?",
    ).bind(OUTER_WORKSPACE),
  ])
  const self = await active.post(agentWorkspacePaths.archive(), {})
  expect(self.status).toBe(200)
  const saved = record(record(await self.json()).workspace)
  expect(saved.state).toBe('archived')
  expect(saved.restoreUntil).toBe(
    Number(saved.archivedAt) + WORKSPACE_RESTORE_MS,
  )
  expect(active.boat.stopIds).toContain('calling-computer')
  expect(
    await active.env.DB.prepare(
      'SELECT revoked_at FROM workspace_tokens WHERE workspace_id = ?',
    )
      .bind(OUTER_WORKSPACE)
      .first('revoked_at'),
  ).toBe(saved.archivedAt)
  const afterArchive = await get(active)
  expect(afterArchive.status).toBe(401)
  const state = new Map(await (await active.actor()).inspectFeatureState())
  expect(record(state.get(chatKey('turn', active.sourceTurnId))).state).toBe(
    'stopped',
  )
})
