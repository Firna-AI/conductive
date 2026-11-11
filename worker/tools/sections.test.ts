import { afterEach, beforeAll, expect, it } from 'vitest'

import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import { agentSectionDeletePath } from '../../src/shared/agent-sections'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OTHER_WORKSPACE,
  OUTER_ORG,
  OUTER_SECTION,
} from '../chat/integration/outer-seed.test-support'
import { record, string } from '../chat/inputs'
import {
  agentWriteFixture,
  type AgentWriteFixture,
} from '../features/agent-session-writes.test-support'
import { machineRead } from './session-management.test-support'

let bundle: string
let fixture: AgentWriteFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
afterEach(async () => {
  await fixture?.dispose()
})

it('uses sender section rights and returns live archived and routine work to General on delete', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  const first = await active.post(MACHINE_PATHS.sections, {
    name: '  Review  board  ',
    orgId: 'other-org',
    senderUserId: 'outsider',
  })
  expect(first.status).toBe(201)
  const section = record(record(await first.json()).section)
  const id = string(section.id)
  expect(section).toEqual({ id, name: 'Review  board', default: false })
  const second = await active.post(MACHINE_PATHS.sections, { name: 'Later' })
  expect(second.status).toBe(201)
  const listed = record(
    await (await machineRead(active, MACHINE_PATHS.sections)).json(),
  )
  expect(listed.sections).toMatchObject([
    { id: OUTER_SECTION, default: true },
    { id, name: 'Review  board' },
    { name: 'Later' },
  ])
  for (const turn of [null, 'stale-turn']) {
    const denied = await active.post(
      MACHINE_PATHS.sections,
      { name: 'Denied' },
      turn,
    )
    expect(denied.status).toBe(403)
    expect(await denied.json()).toMatchObject({
      error: { code: 'calling_turn_required' },
    })
  }
  const blank = await active.post(MACHINE_PATHS.sections, { name: '  ' })
  expect(blank.status).toBe(400)
  expect(await blank.json()).toMatchObject({ error: { code: 'invalid_input' } })
  await active.env.DB.batch([
    active.env.DB.prepare(
      'UPDATE workspaces SET section_id = ? WHERE id = ?',
    ).bind(id, OTHER_WORKSPACE),
    active.env.DB.prepare(
      "INSERT INTO workspaces (id, org_id, repository_id, owner_user_id, section_id, name, branch, state, archived_at, created_at, updated_at) VALUES ('archived-section-work', 'chat-org', 'chat-repository', 'owner', ?, 'Archived', 'owner/archived', 'archived', 1, 1, 1)",
    ).bind(id),
    active.env.DB.prepare(
      "INSERT INTO workspace_runtime (workspace_id, org_id, created_by_user_id, session_id, first_turn_id, agent, model, effort, first_message_id) VALUES ('archived-section-work', 'chat-org', 'owner', 'archived-session', 'archived-turn', 'claude', 'test-claude', 'high', 'archived-message')",
    ),
    active.env.DB.prepare(
      "INSERT INTO routines (id, org_id, owner_user_id, name, repository_id, section_id, prompt, agent, model, effort, time_zone, triggers_json, created_at, updated_at) VALUES ('section-routine', 'chat-org', 'member', 'Keep routine', 'chat-repository', ?, 'Task', 'claude', 'test-claude', 'high', 'UTC', '[]', 1, 1)",
    ).bind(id),
    active.env.DB.prepare(
      "INSERT INTO sections (id, org_id, name, position, created_at) VALUES ('foreign-section', 'other-org', 'Private', 0, 1)",
    ),
  ])
  const defaultDelete = await active.post(
    agentSectionDeletePath(OUTER_SECTION),
    {},
  )
  expect(defaultDelete.status).toBe(200)
  expect(await defaultDelete.json()).toEqual({ deleted: false })
  for (const sectionId of ['foreign-section', 'missing']) {
    const denied = await active.post(agentSectionDeletePath(sectionId), {})
    expect(denied.status).toBe(404)
    expect(await denied.json()).toMatchObject({
      error: { code: 'section_not_found' },
    })
  }
  expect(
    await active.env.DB.prepare(
      "SELECT name FROM sections WHERE org_id = 'other-org' AND id = 'foreign-section'",
    ).first('name'),
  ).toBe('Private')
  const deleted = await active.post(agentSectionDeletePath(id), {})
  expect(deleted.status).toBe(200)
  expect(await deleted.json()).toEqual({ deleted: true })
  expect(
    await active.env.DB.prepare(
      'SELECT id FROM sections WHERE org_id = ? AND id = ?',
    )
      .bind(OUTER_ORG, id)
      .first(),
  ).toBeNull()
  const moved = await active.env.DB.prepare(
    "SELECT id, section_id AS sectionId FROM workspaces WHERE id IN (?, 'archived-section-work') ORDER BY id",
  )
    .bind(OTHER_WORKSPACE)
    .all<{ id: string; sectionId: string }>()
  expect(moved.results).toEqual([
    { id: 'archived-section-work', sectionId: OUTER_SECTION },
    { id: OTHER_WORKSPACE, sectionId: OUTER_SECTION },
  ])
  expect(
    await active.env.DB.prepare(
      "SELECT section_id AS sectionId, active FROM routines WHERE id = 'section-routine'",
    ).first(),
  ).toEqual({ sectionId: OUTER_SECTION, active: 1 })
  expect(
    (await (await active.actor(OTHER_WORKSPACE)).readChatWorkspaceSummary())
      .throughEventNumber,
  ).toBe(1)
  await active.env.DB.prepare(
    "DELETE FROM org_members WHERE org_id = 'chat-org' AND user_id = 'member'",
  ).run()
  const left = await active.post(MACHINE_PATHS.sections, {
    name: 'No longer a member',
  })
  expect(left.status).toBe(403)
  expect(await left.json()).toMatchObject({
    error: { code: 'membership_required' },
  })
})
