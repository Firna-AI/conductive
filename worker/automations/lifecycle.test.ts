import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { memberPath } from '../../src/shared/members'
import { repositoryPath } from '../../src/shared/org-settings'
import { leaveOrgPath } from '../../src/shared/orgs'
import {
  automationPath,
  type AutomationResponse,
} from '../../src/shared/automations'
import { deleteShellSection } from '../app-api/feature-sections-data'
import { seedWorkspace, write } from '../members/members-test-support'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { automationFixture } from './routes.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

it('moves departed owners automations to the workspace recipient, disabled, within that org only', async () => {
  const { org, member, other, admin, seed, members } =
    await automationFixture(harness)
  const path = await seed()
  const stays = await seed('admin-automation', admin.user)
  const removed = await seed('removed-automation', other.user)
  await seedWorkspace(
    harness,
    org,
    member.user,
    'departed-workspace',
    'automation-repository',
  )
  const second = await harness.createOrg(member.session)
  await harness.env.DB.prepare(
    `INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch, installation_id)
    VALUES ('other-repository', ?, 202, 'example/other', 'main', 91)`,
  )
    .bind(second.id)
    .run()
  await harness.env.DB.prepare(
    `INSERT INTO automations
    (id, org_id, owner_user_id, name, repository_id, section_id, prompt, agent, model, effort, time_zone, triggers_json, created_at, updated_at)
    VALUES ('other-org-automation', ?, ?, 'Other task', 'other-repository', ?, 'Keep work', 'codex', 'test-model', 'medium', 'UTC', '[]', ?, ?)`,
  )
    .bind(
      second.id,
      member.user.id,
      `general-${second.id}`,
      TEST_TIME,
      TEST_TIME,
    )
    .run()
  const leave = await members.request(
    leaveOrgPath(org.id),
    member.session,
    write({}),
  )
  expect(leave.status).toBe(204)
  const read: AutomationResponse = await (
    await harness.request(path, admin.session)
  ).json()
  expect(read.automation).toMatchObject({
    owner: { id: admin.user.id },
    active: false,
    inactiveReason: 'owner_left',
    movedFrom: 'member',
    nextRunAt: null,
    prompt: 'Summarize the work.',
  })
  expect(
    await harness.env.DB.prepare(
      'SELECT owner_user_id FROM workspaces WHERE id = ?',
    )
      .bind('departed-workspace')
      .first('owner_user_id'),
  ).toBe(admin.user.id)
  expect(
    await (await harness.request(stays, admin.session)).json(),
  ).toMatchObject({ automation: { active: true, movedFrom: null } })
  expect(
    await (
      await harness.request(
        automationPath(second.id, 'other-org-automation'),
        member.session,
      )
    ).json(),
  ).toMatchObject({
    automation: { owner: { id: member.user.id }, active: true },
  })
  expect(
    (
      await members.request(
        memberPath(org.id, other.user.id),
        admin.session,
        write({}, 'DELETE'),
      )
    ).status,
  ).toBe(204)
  expect(
    await (await harness.request(removed, admin.session)).json(),
  ).toMatchObject({
    automation: {
      owner: { id: admin.user.id },
      active: false,
      inactiveReason: 'owner_left',
      movedFrom: 'other',
    },
  })
  expect(
    (
      await harness.request(
        path,
        admin.session,
        write({ active: true }, 'PATCH'),
      )
    ).status,
  ).toBe(200)
  expect(
    await (await harness.request(path, admin.session)).json(),
  ).toMatchObject({ automation: { active: true, inactiveReason: null } })
})

it('moves a deleted sections automations to General and keeps their active state', async () => {
  const { org, member, seed } = await automationFixture(harness)
  const path = await seed()
  await harness.env.DB.batch([
    harness.env.DB.prepare(
      `INSERT INTO sections (id, org_id, name, position, created_at) VALUES ('automation-extra', ?, 'Extra', 1, ?)`,
    ).bind(org.id, TEST_TIME),
    harness.env.DB.prepare(
      `UPDATE automations SET section_id = 'automation-extra' WHERE org_id = ?`,
    ).bind(org.id),
  ])
  await expect(
    deleteShellSection(harness.env.DB, {
      orgId: org.id,
      userId: member.user.id,
      sectionId: 'automation-extra',
      now: TEST_TIME + 1,
    }),
  ).resolves.toEqual({ deleted: true, workspaceIds: [] })
  expect(
    await (await harness.request(path, member.session)).json(),
  ).toMatchObject({
    automation: {
      sectionId: 'general-members-org',
      active: true,
      updatedAt: TEST_TIME + 1,
    },
  })
})

it('turns automations off when their repository is deselected and refuses reactivation', async () => {
  const { org, member, admin, seed } = await automationFixture(harness)
  const path = await seed()
  const removed = await harness.request(
    repositoryPath(org.id, 'automation-repository'),
    admin.session,
    write({}, 'DELETE'),
  )
  expect(removed.status).toBe(200)
  expect(
    await (await harness.request(path, member.session)).json(),
  ).toMatchObject({
    automation: {
      active: false,
      inactiveReason: 'repository_removed',
      nextRunAt: null,
    },
  })
  const reenable = await harness.request(
    path,
    member.session,
    write({ active: true }, 'PATCH'),
  )
  expect(reenable.status).toBe(404)
  expect(await reenable.json()).toMatchObject({
    error: { code: 'repository_not_found' },
  })
})

it('deletes an automations history while retaining its normal run workspaces', async () => {
  const { org, member, seed } = await automationFixture(harness)
  const path = await seed()
  await seedWorkspace(
    harness,
    org,
    member.user,
    'kept-workspace',
    'automation-repository',
  )
  await harness.env.DB.prepare(
    `INSERT INTO automation_runs
    (id, automation_id, org_id, run_key, message_id, trigger_json, state, workspace_id, created_at, updated_at)
    VALUES ('stored-run', 'automation-one', ?, 'manual:automation-one:request', 'message-one', '{"kind":"run-now"}', 'queued', 'kept-workspace', ?, ?)`,
  )
    .bind(org.id, TEST_TIME, TEST_TIME)
    .run()
  expect(
    (await harness.request(path, member.session, write({}, 'DELETE'))).status,
  ).toBe(204)
  expect(
    await harness.env.DB.prepare(
      'SELECT COUNT(*) FROM automation_runs WHERE automation_id = ?',
    )
      .bind('automation-one')
      .first('COUNT(*)'),
  ).toBe(0)
  expect(
    await harness.env.DB.prepare('SELECT id FROM workspaces WHERE id = ?')
      .bind('kept-workspace')
      .first('id'),
  ).toBe('kept-workspace')
})
