import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  secretAnswerPath,
  secretRequestsPath,
  workspaceSecretValuePath,
} from '../../src/shared/secret-requests'
import { readSecretRequestsResponse } from '../../src/shared/secret-requests-read'
import { hash } from '../security/crypto'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import {
  capabilitySecret,
  capabilityValue,
} from './capability-context.test-support'
import { noticeFixture } from './capability-notices.test-support'
import { WORKSPACE_ID, WORKSPACE_TOKEN } from './harness.test-support'

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

it('tells only other sessions when an answer gives a workspace value and settles covered requests', async () => {
  const f = await noticeFixture(harness)
  const asking = await f.createSession()
  const covered = await f.createSession()
  const other = await f.createSession()
  const askingTurn = await f.start(asking.id, 'ask')
  const coveredTurn = await f.start(covered.id, 'covered')
  const otherTurn = await f.start(other.id, 'other')
  const tokenHash = await hash(WORKSPACE_TOKEN)
  await f.changeWorkspace(WORKSPACE_ID, async (view) => {
    for (const turn of [askingTurn, coveredTurn])
      await view.secrets.save({
        orgId: f.org.id,
        tokenHash,
        names: ['NEW_KEY'],
        request: {
          id: `request-${turn.sessionId}`,
          workspaceId: WORKSPACE_ID,
          sessionId: turn.sessionId,
          turnId: turn.turnId,
          sender: turn.message.sender,
          secrets: [{ name: 'NEW_KEY', secretId: null, description: '' }],
          reason: 'Deploy',
          command: 'deploy',
          state: 'waiting',
          late: false,
          createdAt: TEST_TIME,
          updatedAt: TEST_TIME,
          answeredBy: null,
          lifetime: null,
          endedBy: null,
          notice: null,
        },
      })
  })
  const answer = await f.fetch(
    secretAnswerPath(f.org.id, WORKSPACE_ID, `request-${asking.id}`),
    {
      kind: 'values',
      lifetime: 'workspace',
      values: { NEW_KEY: 'private-workspace-key' },
    },
    f.memberCookie,
  )
  expect(answer.status).toBe(200)
  expect(await f.notes(asking.id)).toEqual([])
  expect(await f.notes(covered.id)).toEqual([])
  expect(await f.waitingNotes(other.id)).toMatchObject([
    {
      member: { id: f.member.id },
      changes: [{ kind: 'value-given', names: ['NEW_KEY'] }],
    },
  ])
  expect(f.runner.commands.at(-1)).toMatchObject({
    type: 'notice',
    sessionId: other.id,
    turnId: otherTurn.turnId,
    notices: [{ text: 'Teammate gave `NEW_KEY` for this workspace.' }],
  })
  const state = readSecretRequestsResponse(
    await (await f.fetch(secretRequestsPath(f.org.id, WORKSPACE_ID))).json(),
  )
  expect(state.requests.map((request) => request.state)).toEqual([
    'allowed',
    'allowed',
  ])
  const temporary = await f.chat.readWorkspace(WORKSPACE_ID, (view) =>
    view.secrets.values(),
  )
  const transcript = (await f.history(other.id)).events
  const serialized = JSON.stringify([
    transcript,
    f.runner.commands,
    await f.waitingNotes(other.id),
  ])
  expect(serialized).not.toContain('private-workspace-key')
  expect(serialized).not.toContain(temporary[0].ciphertext)
  expect(serialized).not.toContain('ciphertext')
  const removal = await f.fetch(
    workspaceSecretValuePath(
      f.org.id,
      WORKSPACE_ID,
      state.workspaceValues[0].id,
    ),
    undefined,
    f.ownerCookie,
    'DELETE',
  )
  expect(removal.status).toBe(204)
  expect(await f.waitingNotes(other.id)).toMatchObject([
    { changes: [{ kind: 'value-given', names: ['NEW_KEY'] }] },
    { changes: [{ kind: 'value-removed', names: ['NEW_KEY'] }] },
  ])
  expect(await f.notes(asking.id)).toHaveLength(1)
  expect(await f.notes(covered.id)).toHaveLength(1)
})

it('sends no removal note when another workspace value or grant still covers the name', async () => {
  const f = await noticeFixture(harness)
  const session = await f.createSession()
  await capabilitySecret(f, 'COVERED', true)
  await capabilityValue(f, 'covered', 'COVERED')
  await capabilityValue(f, 'first', 'DUPLICATE')
  await capabilityValue(f, 'second', 'DUPLICATE')
  await f.start(session.id, 'first')
  for (const id of ['covered', 'first']) {
    expect(
      (
        await f.fetch(
          workspaceSecretValuePath(f.org.id, WORKSPACE_ID, id),
          undefined,
          f.ownerCookie,
          'DELETE',
        )
      ).status,
    ).toBe(204)
    expect(await f.notes(session.id)).toEqual([])
  }
  expect(
    (
      await f.fetch(
        workspaceSecretValuePath(f.org.id, WORKSPACE_ID, 'second'),
        undefined,
        f.ownerCookie,
        'DELETE',
      )
    ).status,
  ).toBe(204)
  expect(await f.waitingNotes(session.id)).toMatchObject([
    { changes: [{ kind: 'value-removed', names: ['DUPLICATE'] }] },
  ])
})
