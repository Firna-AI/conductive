import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  routinePath,
  routinesPath,
  type RoutineResponse,
  type RoutinesResponse,
} from '../../src/shared/routines'
import { write } from '../members/members-test-support'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { routineFixture } from './routes.test-support'

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

it('lets every org member read routine data and lets a member create with defaults', async () => {
  const { org, member, other, input, seed } = await routineFixture(harness)
  const path = await seed()
  const read = await harness.request(path, other.session)
  expect(read.status).toBe(200)
  const { routine }: RoutineResponse = await read.json()
  expect(routine).toMatchObject({
    id: 'routine-one',
    owner: { id: member.user.id },
    prompt: input.prompt,
    inactiveReason: null,
    movedFrom: null,
    failedRunsInARow: 0,
  })
  const listed = await harness.request(routinesPath(org.id), other.session)
  expect(listed.status).toBe(200)
  expect(listed.headers.get('Cache-Control')).toBe('no-store')
  const list: RoutinesResponse = await listed.json()
  expect(list.routines).toEqual([{ ...routine, lastRun: null }])
  await harness.env.DB.prepare(
    `INSERT INTO routine_runs
    (id, routine_id, org_id, run_key, message_id, trigger_json, state, error_code, error_message, created_at, updated_at)
    VALUES ('last-run', 'routine-one', ?, 'manual:routine-one:last', 'last-message', '{"kind":"run-now"}',
      'failed', 'agent_login_required', 'Connect Codex.', ?, ?)`,
  )
    .bind(org.id, TEST_TIME, TEST_TIME)
    .run()
  const withRun: RoutinesResponse = await (
    await harness.request(routinesPath(org.id), other.session)
  ).json()
  expect(withRun.routines[0].lastRun).toEqual({
    id: 'last-run',
    routineId: 'routine-one',
    orgId: org.id,
    trigger: { kind: 'run-now' },
    state: 'failed',
    error: { code: 'agent_login_required', message: 'Connect Codex.' },
    workspaceId: null,
    createdAt: TEST_TIME,
    updatedAt: TEST_TIME,
  })
  const created = await harness.request(
    routinesPath(org.id),
    member.session,
    write({ ...input, name: '  ', sectionId: undefined, active: undefined }),
  )
  expect(created.status).toBe(201)
  expect(await created.json()).toMatchObject({
    routine: {
      name: 'Untitled routine',
      sectionId: 'general-members-org',
      owner: { id: member.user.id },
      active: true,
      createdAt: TEST_TIME,
    },
  })
  expect(harness.boat.requests).toEqual([])
})

it('lets only the owner edit or enable and lets an admin disable or delete', async () => {
  const { org, member, other, admin, seed } = await routineFixture(harness)
  const path = await seed()
  for (const actor of [other, admin]) {
    for (const body of [
      { name: 'Stolen prompt' },
      { active: true },
      { active: false, prompt: 'Changed' },
    ]) {
      const denied = await harness.request(
        path,
        actor.session,
        write(body, 'PATCH'),
      )
      expect(denied.status).toBe(403)
      expect(await denied.json()).toMatchObject({
        error: { code: 'routine_owner_required' },
      })
    }
  }
  expect(
    (
      await harness.request(
        path,
        other.session,
        write({ active: false }, 'PATCH'),
      )
    ).status,
  ).toBe(403)
  expect(
    (await harness.request(path, other.session, write({}, 'DELETE'))).status,
  ).toBe(403)
  const off = await harness.request(
    path,
    admin.session,
    write({ active: false }, 'PATCH'),
  )
  expect(off.status).toBe(200)
  expect(await off.json()).toMatchObject({
    routine: { active: false, nextRunAt: null },
  })
  const changed = await harness.request(
    path,
    member.session,
    write(
      { name: 'Renamed', active: true, timeZone: 'America/New_York' },
      'PATCH',
    ),
  )
  expect(changed.status).toBe(200)
  expect(await changed.json()).toMatchObject({
    routine: {
      name: 'Renamed',
      active: true,
      timeZone: 'America/New_York',
      nextRunAt: Date.parse('2027-01-15T14:00:00Z'),
    },
  })
  expect(
    (await harness.request(path, admin.session, write({}, 'DELETE'))).status,
  ).toBe(204)
  expect((await harness.request(path, member.session)).status).toBe(404)
  const ownerPath = await seed('owner-delete')
  expect(
    (await harness.request(ownerPath, member.session, write({}, 'DELETE')))
      .status,
  ).toBe(204)
  expect(
    (await harness.request(routinePath(org.id, 'missing'), member.session))
      .status,
  ).toBe(404)
})

it('refuses empty prompts and foreign repository or section references on create and update', async () => {
  const { org, member, input, seed } = await routineFixture(harness)
  const path = await seed()
  await harness.env.DB.batch([
    harness.env.DB.prepare(
      `INSERT INTO orgs (id, name, creator_user_id, created_at) VALUES ('foreign-org', 'Foreign', ?, ?)`,
    ).bind(member.user.id, TEST_TIME),
    harness.env.DB.prepare(
      `INSERT INTO sections (id, org_id, name, position, created_at) VALUES ('foreign-section', 'foreign-org', 'Foreign', 0, ?)`,
    ).bind(TEST_TIME),
    harness.env.DB.prepare(
      `INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch) VALUES ('foreign-repo', 'foreign-org', 202, 'foreign/repo', 'main')`,
    ),
    harness.env.DB.prepare(
      `INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch, selected) VALUES ('removed-repo', ?, 203, 'example/removed', 'main', 0)`,
    ).bind(org.id),
  ])
  for (const [body, code, status] of [
    [{ prompt: '' }, 'invalid_input', 400],
    [{ prompt: ' \n\t ' }, 'invalid_input', 400],
    [{ repositoryId: 'foreign-repo' }, 'repository_not_found', 404],
    [{ repositoryId: 'removed-repo' }, 'repository_not_found', 404],
    [{ sectionId: 'foreign-section' }, 'section_not_found', 404],
    [
      { choice: { agent: 'other', model: 'model', effort: 'medium' } },
      'invalid_input',
      400,
    ],
    [
      { choice: { agent: 'codex', model: 'model', effort: 'invalid' } },
      'invalid_input',
      400,
    ],
  ] as const) {
    for (const [target, method, requestBody] of [
      [routinesPath(org.id), 'POST', { ...input, ...body }],
      [path, 'PATCH', body],
    ] as const) {
      const response = await harness.request(
        target,
        member.session,
        write(requestBody, method),
      )
      expect(response.status, JSON.stringify(body)).toBe(status)
      expect(await response.json()).toMatchObject({ error: { code } })
    }
  }
})

it('keeps org boundaries and the app gate on reads and writes', async () => {
  const { org, member, seed } = await routineFixture(harness)
  const path = await seed()
  expect((await harness.fetch(path)).status).toBe(401)
  const another = await harness.createOrg(member.session)
  expect(
    (
      await harness.request(
        routinePath(another.id, 'routine-one'),
        member.session,
      )
    ).status,
  ).toBe(404)
  const forbidden = await harness.fetch(path, {
    ...write({ active: false }, 'PATCH'),
    headers: {
      Cookie: member.session,
      Origin: 'https://foreign.example',
      'Content-Type': 'application/json',
    },
  })
  expect(forbidden.status).toBe(403)
  expect(await forbidden.json()).toMatchObject({
    error: { code: 'origin_forbidden' },
  })
  await harness.env.DB.prepare('UPDATE orgs SET suspended_at = ? WHERE id = ?')
    .bind(TEST_TIME, org.id)
    .run()
  expect((await harness.request(path, member.session)).status).toBe(200)
  for (const method of ['POST', 'PATCH', 'DELETE']) {
    const response = await harness.request(
      method === 'POST' ? routinesPath(org.id) : path,
      member.session,
      write({}, method),
    )
    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({
      error: { code: 'org_suspended' },
    })
  }
  await harness.env.DB.prepare(
    'DELETE FROM org_members WHERE org_id = ? AND user_id = ?',
  )
    .bind(org.id, member.user.id)
    .run()
  expect((await harness.request(path, member.session)).status).toBe(404)
})
