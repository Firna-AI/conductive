import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { saveGitHubTokens } from '../security/github-tokens'
import { startRoutineRun } from './run-starter'
import { runFixture } from './runs.test-support'

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

it('creates a run workspace with the routine owner, repository, section, model, and first message before the start', async () => {
  const fixture = await runFixture(harness)
  const { runtime, org, user, repositoryId, boat, seedRun } = fixture
  await seedRun()
  const queued = fixture.nextQueued()
  const starting = startRoutineRun(runtime, org.id, 'run-one')
  const id = await queued
  await fixture.starts.get(id)!.advance()
  await starting
  expect(
    await runtime.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM workspaces',
    ).first('count'),
  ).toBe(1)
  expect(
    await runtime.env.DB.prepare(
      `SELECT w.owner_user_id AS owner, w.repository_id AS repository,
    w.section_id AS section, w.state, r.created_by_user_id AS sender, r.agent, r.model, r.effort,
    r.first_message_id AS message FROM workspaces w JOIN workspace_runtime r ON r.workspace_id = w.id`,
    ).first(),
  ).toEqual({
    owner: user.id,
    repository: repositoryId,
    section: 'run-section',
    state: 'starting',
    sender: user.id,
    agent: 'codex',
    model: 'run-model',
    effort: 'high',
    message: 'message-run-one',
  })
  expect(fixture.acceptFirstMessage).toHaveBeenCalledWith(
    expect.objectContaining({
      sender: user,
      request: {
        id: 'message-run-one',
        text: 'Summarize the work.\n\n---\nRoutine: Morning summary\nTrigger: Run now',
        attachmentIds: [],
        choice: { agent: 'codex', model: 'run-model', effort: 'high' },
      },
    }),
  )
  expect(boat.starts).toEqual([])
})

it('joins concurrent starts of the same run and does not create again after a later start failure', async () => {
  const fixture = await runFixture(harness)
  const { runtime, org, seedRun, boat } = fixture
  await seedRun()
  await fixture.run(() =>
    Promise.all([
      startRoutineRun(runtime, org.id, 'run-one'),
      startRoutineRun(runtime, org.id, 'run-one'),
    ]),
  )
  expect(
    await runtime.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM workspace_creation_attempts',
    ).first('count'),
  ).toBe(1)
  const id = await runtime.env.DB.prepare(
    'SELECT workspace_id FROM routine_runs',
  ).first<string>('workspace_id')
  expect(id).toBeTypeOf('string')
  const actor = fixture.starts.get(id!)!
  boat.commandExitCode = 1
  for (let step = 0; step < 12 && (await actor.job()); step++)
    await actor.advance()
  await startRoutineRun(runtime, org.id, 'run-one')
  expect(
    await runtime.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM workspace_creation_attempts',
    ).first('count'),
  ).toBe(1)
  expect(boat.starts).toHaveLength(1)
})

it('fails missing agent and expired GitHub logins before any workspace create', async () => {
  const fixture = await runFixture(harness)
  const { runtime, org, user, seedRun } = fixture
  await seedRun('missing-agent')
  await runtime.env.DB.prepare(
    "DELETE FROM agent_logins WHERE user_id = ? AND agent = 'codex'",
  )
    .bind(user.id)
    .run()
  await startRoutineRun(runtime, org.id, 'missing-agent')
  expect(
    await runtime.env.DB.prepare(
      "SELECT state, error_code AS code FROM routine_runs WHERE id = 'missing-agent'",
    ).first(),
  ).toEqual({
    state: 'failed',
    code: 'agent_login_required',
  })
  const saved = await harness.request(
    '/api/account/agent-logins/codex',
    fixture.session,
    {
      method: 'PUT',
      body: JSON.stringify({
        agent: 'codex',
        kind: 'api-key',
        secret: 'run-secret',
      }),
    },
  )
  expect(saved.status).toBe(200)
  await saveGitHubTokens(
    runtime.env,
    user.id,
    {
      accessToken: 'expired',
      refreshToken: 'expired-refresh',
      expiresAt: TEST_TIME - 1,
      refreshExpiresAt: TEST_TIME - 1,
    },
    TEST_TIME,
  )
  await seedRun('expired-github')
  await startRoutineRun(runtime, org.id, 'expired-github')
  expect(
    await runtime.env.DB.prepare(
      "SELECT state, error_code AS code FROM routine_runs WHERE id = 'expired-github'",
    ).first(),
  ).toEqual({
    state: 'failed',
    code: 'github_reconnect_required',
  })
  expect(
    await runtime.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM workspace_creation_attempts',
    ).first('count'),
  ).toBe(0)
  expect(fixture.boat.starts).toEqual([])
})
