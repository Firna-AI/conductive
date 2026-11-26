import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { creationPreapprovals } from '../secrets/capabilities-writes'
import { sessionApproval } from '../secrets/grant-data'
import { FakeRunner } from '../test-support/fake-runner'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import {
  capabilitySecret,
  capabilityValue,
} from './capability-context.test-support'
import { createChatFixture, WORKSPACE_ID } from './harness.test-support'

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

it('sends empty facts on turns only and refreshes them for the next turn', async () => {
  const f = await createChatFixture(harness)
  const session = await f.createSession()
  const runner = await f.connect(new FakeRunner({ workspaceId: WORKSPACE_ID }))
  runner.emit({ type: 'runner.ready' })
  await f.drain()
  await f.send(session.id, 'first')
  const first = runner.commands[0]
  expect(first).toMatchObject({
    type: 'turn',
    capabilities: { secrets: [] },
  })
  if (first?.type !== 'turn') throw new Error('The first turn is missing.')
  expect(first.capabilities).toEqual({ secrets: [] })
  await f.send(session.id, 'during')
  expect(runner.commands.at(-1)?.type).toBe('message')
  expect(runner.commands.at(-1)).not.toHaveProperty('capabilities')
  runner.emit({
    type: 'turn.completed',
    sessionId: session.id,
    turnId: first.turnId,
    state: 'finished',
    durationMs: 0,
    files: [],
    omittedFileCount: 0,
    userMessageIds: ['first', 'during'],
  })
  await f.drain()
  await capabilitySecret(f, 'NEXT_KEY', true)
  await f.send(session.id, 'next')
  expect(runner.commands.at(-1)).toMatchObject({
    type: 'turn',
    capabilities: { secrets: ['NEXT_KEY'] },
  })
})

it('dispatches sorted unique names from this session grants and workspace values without private data', async () => {
  const f = await createChatFixture(harness)
  const session = await f.createSession()
  const otherSession = await f.createSession()
  await f.send(session.id, 'queued')

  const all = await capabilitySecret(f, 'Z_ALL', true)
  const preapproved = await capabilitySecret(f, 'A_PREAPPROVED')
  const approved = await capabilitySecret(f, 'M_SESSION')
  const otherApproved = await capabilitySecret(f, 'N_OTHER_SESSION')
  const otherWorkspace = await capabilitySecret(f, 'B_OTHER_WORKSPACE')
  const unapproved = await capabilitySecret(f, 'U_UNAPPROVED')
  const ungranted = await capabilitySecret(f, 'C_NO_GRANT')
  await f.env.DB.prepare(
    `INSERT INTO workspaces (id, org_id, repository_id, owner_user_id, name, branch, created_at, updated_at)
     SELECT 'other-workspace', org_id, repository_id, owner_user_id, '', 'other/branch', created_at, updated_at
     FROM workspaces WHERE id = ?`,
  )
    .bind(WORKSPACE_ID)
    .run()
  await f.env.DB.batch([
    creationPreapprovals(f.env.DB, {
      orgId: f.org.id,
      workspaceId: WORKSPACE_ID,
      secretIds: [preapproved.id, all.id],
      userId: f.owner.id,
      now: TEST_TIME,
    }),
    creationPreapprovals(f.env.DB, {
      orgId: f.org.id,
      workspaceId: 'other-workspace',
      secretIds: [otherWorkspace.id],
      userId: f.owner.id,
      now: TEST_TIME,
    }),
    ...[
      { secretId: approved.id, sessionId: session.id },
      { secretId: otherApproved.id, sessionId: otherSession.id },
      { secretId: all.id, sessionId: session.id },
    ].map((approval) =>
      sessionApproval(f.env.DB, {
        ...approval,
        orgId: f.org.id,
        workspaceId: WORKSPACE_ID,
        userId: f.owner.id,
        now: TEST_TIME,
      }),
    ),
    sessionApproval(f.env.DB, {
      orgId: f.org.id,
      workspaceId: 'other-workspace',
      sessionId: session.id,
      secretId: otherWorkspace.id,
      userId: f.owner.id,
      now: TEST_TIME,
    }),
  ])
  await f.env.DB.batch([
    f.env.DB.prepare(
      "INSERT INTO orgs (id, name, creator_user_id, created_at) VALUES ('other-org', 'Other org', ?, ?)",
    ).bind(f.owner.id, TEST_TIME),
    f.env.DB.prepare(
      "INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES ('other-org', ?, 'admin', ?)",
    ).bind(f.owner.id, TEST_TIME),
  ])
  const outside = await capabilitySecret(f, 'O_OTHER_ORG', true, 'other-org')
  const values = [
    await capabilityValue(f, 'workspace-value', 'W_WORKSPACE_VALUE'),
    await capabilityValue(f, 'duplicate-value', 'Z_ALL'),
    await capabilityValue(f, 'same-name-as-unapproved', 'U_UNAPPROVED'),
    await capabilityValue(
      f,
      'fifteen-minutes',
      'F_FIFTEEN',
      session.id,
      TEST_TIME + 900_000,
    ),
    await capabilityValue(
      f,
      'other-fifteen-minutes',
      'G_OTHER_FIFTEEN',
      otherSession.id,
      TEST_TIME + 900_000,
    ),
    await capabilityValue(f, 'expired', 'E_EXPIRED', session.id, TEST_TIME),
  ]

  const runner = await f.connect(new FakeRunner({ workspaceId: WORKSPACE_ID }))
  runner.emit({ type: 'runner.ready' })
  await f.drain()
  const turn = runner.commands[0]
  expect(turn).toMatchObject({ type: 'turn', sessionId: session.id })
  if (turn?.type !== 'turn') throw new Error('The queued turn is missing.')
  expect(turn.capabilities).toEqual({
    secrets: [
      'A_PREAPPROVED',
      'M_SESSION',
      'U_UNAPPROVED',
      'W_WORKSPACE_VALUE',
      'Z_ALL',
    ],
  })
  const serialized = JSON.stringify(turn)
  expect(serialized).not.toContain('ciphertext')
  for (const secret of [
    all,
    preapproved,
    approved,
    otherApproved,
    otherWorkspace,
    unapproved,
    ungranted,
    outside,
  ]) {
    expect(serialized).not.toContain(secret.value)
    expect(serialized).not.toContain(secret.ciphertext)
    expect(serialized).not.toContain(secret.description)
  }
  for (const value of values) {
    expect(serialized).not.toContain(value.value)
    expect(serialized).not.toContain(value.ciphertext)
  }
  await f.send(otherSession.id, 'other-session')
  const otherTurn = runner.commands.at(-1)
  if (otherTurn?.type !== 'turn') throw new Error('The other turn is missing.')
  expect(otherTurn.capabilities).toEqual({
    secrets: [
      'A_PREAPPROVED',
      'N_OTHER_SESSION',
      'U_UNAPPROVED',
      'W_WORKSPACE_VALUE',
      'Z_ALL',
    ],
  })
})
