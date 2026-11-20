import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import * as creationSecrets from '../secrets/capabilities-data'
import { deleteSecret } from '../secrets/writes'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { readAutomation } from './automation-data'
import {
  automationSecret,
  chooseAutomationSecrets,
} from './capabilities.test-support'
import { startAutomationRun } from './run-starter'
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

it('copies the chosen secrets into the run workspace with its owner as approver and Mac access off', async () => {
  const fixture = await runFixture(harness)
  const { runtime, org, user } = fixture
  const db = runtime.env.DB
  await automationSecret(db, org.id, user.id, 'chosen-secret')
  await chooseAutomationSecrets(db, org.id, user.id, ['chosen-secret'])
  await fixture.seedRun()
  await fixture.run(() => startAutomationRun(runtime, org.id, 'run-one'))
  const workspace = await db
    .prepare('SELECT id, mac_access AS macAccess FROM workspaces')
    .first<{ id: string; macAccess: number }>()
  expect(workspace?.macAccess).toBe(0)
  expect(
    (
      await db
        .prepare(
          `SELECT workspace_id AS workspaceId, secret_id AS secretId,
      approved_by_user_id AS approvedBy, approved_at AS approvedAt
     FROM workspace_secret_preapprovals`,
        )
        .all()
    ).results,
  ).toEqual([
    {
      workspaceId: workspace?.id,
      secretId: 'chosen-secret',
      approvedBy: user.id,
      approvedAt: TEST_TIME,
    },
  ])
})

it('reads the list again and creates once more when a chosen secret is deleted before the create checks it', async () => {
  const fixture = await runFixture(harness)
  const { runtime, org, user } = fixture
  const db = runtime.env.DB
  await automationSecret(db, org.id, user.id, 'deleted-secret')
  await automationSecret(db, org.id, user.id, 'kept-secret')
  await chooseAutomationSecrets(db, org.id, user.id, [
    'deleted-secret',
    'kept-secret',
  ])
  await fixture.seedRun()
  const requireSecrets = creationSecrets.requireOrgSecrets
  const check = vi
    .spyOn(creationSecrets, 'requireOrgSecrets')
    .mockImplementationOnce(async (...args) => {
      await deleteSecret(db, org.id, 'deleted-secret', user.id)
      return requireSecrets(...args)
    })
  try {
    await fixture.run(() => startAutomationRun(runtime, org.id, 'run-one'))
    expect(check.mock.calls.map((call) => call[2])).toEqual([
      ['deleted-secret', 'kept-secret'],
      ['kept-secret'],
    ])
    const run = await db
      .prepare(
        'SELECT state, workspace_id AS id, error_code AS code FROM automation_runs',
      )
      .first<{ state: string; id: string; code: string | null }>()
    expect(run).toMatchObject({ state: 'started', code: null })
    expect(
      await creationSecrets.readWorkspaceCapabilities(db, org.id, run!.id),
    ).toEqual({
      preapprovedSecretIds: ['kept-secret'],
      macAccess: false,
      sessionApprovals: [],
    })
    expect(
      await db
        .prepare('SELECT COUNT(*) AS count FROM workspace_creation_attempts')
        .first('count'),
    ).toBe(1)
    expect(
      (await readAutomation(db, org.id, 'automation-one')).capabilities,
    ).toEqual({ preapprovedSecretIds: ['kept-secret'] })
  } finally {
    check.mockRestore()
  }
})

it('recovers the creation plan choices when the automation changes after a failed handoff', async () => {
  const fixture = await runFixture(harness)
  const { runtime, org, user } = fixture
  const db = runtime.env.DB
  await automationSecret(db, org.id, user.id, 'first-secret')
  await automationSecret(db, org.id, user.id, 'later-secret')
  await chooseAutomationSecrets(db, org.id, user.id, ['first-secret'])
  await fixture.seedRun()
  const workspace = vi
    .spyOn(runtime, 'workspace')
    .mockImplementationOnce(() => {
      throw new Error('handoff unavailable')
    })
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    await startAutomationRun(runtime, org.id, 'run-one')
    expect(
      await db.prepare('SELECT state FROM automation_runs').first('state'),
    ).toBe('queued')
    await chooseAutomationSecrets(db, org.id, user.id, ['later-secret'])
    workspace.mockRestore()
    await fixture.run(() => startAutomationRun(runtime, org.id, 'run-one'))
    const run = await db
      .prepare('SELECT state, workspace_id AS id FROM automation_runs')
      .first<{ state: string; id: string }>()
    expect(run?.state).toBe('started')
    expect(
      await creationSecrets.readWorkspaceCapabilities(db, org.id, run!.id),
    ).toEqual({
      preapprovedSecretIds: ['first-secret'],
      macAccess: false,
      sessionApprovals: [],
    })
    expect(
      await db
        .prepare('SELECT COUNT(*) AS count FROM workspace_creation_attempts')
        .first('count'),
    ).toBe(1)
  } finally {
    workspace.mockRestore()
    warning.mockRestore()
  }
})
