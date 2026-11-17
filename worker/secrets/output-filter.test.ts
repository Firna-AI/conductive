import { afterEach, beforeAll, expect, it } from 'vitest'
import { chatHistoryPath } from '../../src/shared/events'
import { sessionTranscriptPath } from '../../src/shared/sessions'
import { secretPath } from '../../src/shared/secrets'
import { workspaceSecretValuePath } from '../../src/shared/secret-requests'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { DEVICE_TEST_NOW } from '../devices/clock.test-support'
import { record } from '../chat/inputs'
import { array } from '../chat/agent-events'
import { secretFixture, type SecretFixture } from './requests.test-support'

let bundle: string
let f: SecretFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle(
    'worker/secrets/requests-entry.test-support.ts',
  )
})
afterEach(async () => {
  await f?.dispose()
  f = undefined
})

async function events(active: SecretFixture) {
  const history = record(
    await (
      await active.request(
        chatHistoryPath(OUTER_ORG, OUTER_WORKSPACE, 'first-session'),
      )
    ).json(),
  )
  return array(history.events, (item) => record(record(item).event))
}

it('filters request text and split runner output without copying command output', async () => {
  const active = (f = await secretFixture(bundle))
  await active.seed('TOKEN', 'original-private-token', true)
  expect(
    await (
      await active.run({
        names: ['TOKEN'],
        command: 'deploy original-private-token',
        reason: 'Use original-private-token',
      })
    ).json(),
  ).toMatchObject({ status: 'allowed' })
  const pending = await active.waiting({
    names: ['OTHER'],
    command: 'echo original-private-token',
    reason: 'Needs original-private-token',
  })
  expect(pending.request).toMatchObject({
    command: 'echo [redacted]',
    reason: 'Needs [redacted]',
  })
  await active.answer(pending.request.id, { kind: 'deny' })
  expect((await pending.response).status).toBe(200)
  const context = {
    sessionId: 'first-session',
    turnId: 'first-turn',
    messageId: 'filtered-answer',
  }
  await active.emit({
    type: 'assistant.delta',
    ...context,
    text: 'Result: original-',
  })
  await active.emit({
    type: 'assistant.delta',
    ...context,
    text: 'private-token.',
  })
  await active.emit({
    type: 'assistant.completed',
    ...context,
    text: 'Result: original-private-token.',
    userMessageIds: ['first-message'],
  })
  expect(await events(active)).toContainEqual({
    type: 'assistant.completed',
    ...context,
    text: 'Result: [redacted].',
    userMessageIds: ['first-message'],
  })
  const displayed = (await events(active)).filter((event) =>
    String(event.type).startsWith('secrets.'),
  )
  expect(displayed).toContainEqual(
    expect.objectContaining({
      type: 'secrets.run',
      command: 'deploy [redacted]',
      reason: 'Use [redacted]',
    }),
  )
  expect(JSON.stringify(displayed)).not.toContain('private-token')
  expect(
    displayed.every(
      (event) =>
        !Object.hasOwn(event, 'values') &&
        !Object.hasOwn(event, 'output') &&
        !Object.hasOwn(event, 'durationMs'),
    ),
  ).toBe(true)
  const transcript = await active.request(
    sessionTranscriptPath(OUTER_ORG, OUTER_WORKSPACE, 'first-session', 'full'),
  )
  expect(transcript.status).toBe(200)
  const copy = record(await transcript.json())
  expect(copy.markdown).toContain('deploy [redacted]')
  expect(copy.markdown).toContain(
    'member denied the request. The command did not run.',
  )
})

it('filters current org values after replacement and stops after deletion', async () => {
  const active = (f = await secretFixture(bundle))
  const saved = await active.seed('TOKEN', 'original-private-token', true)
  expect(
    (await active.run({ names: ['TOKEN'], command: 'deploy' })).status,
  ).toBe(200)
  const context = {
    sessionId: 'first-session',
    turnId: 'first-turn',
    messageId: 'current-value-answer',
  }
  const replaced = await active.request(secretPath(OUTER_ORG, saved.id), {
    method: 'PATCH',
    body: JSON.stringify({ value: 'replacement-private-token' }),
  })
  expect(replaced.status).toBe(200)
  await active.emit({
    type: 'assistant.completed',
    ...context,
    messageId: 'after-replace',
    text: 'original-private-token replacement-private-token',
    userMessageIds: ['first-message'],
  })
  expect(await events(active)).toContainEqual({
    type: 'assistant.completed',
    ...context,
    messageId: 'after-replace',
    text: 'original-private-token [redacted]',
    userMessageIds: ['first-message'],
  })
  const removed = await active.request(secretPath(OUTER_ORG, saved.id), {
    method: 'DELETE',
    body: '{}',
  })
  expect(removed.status).toBe(204)
  await active.emit({
    type: 'assistant.completed',
    ...context,
    messageId: 'after-delete',
    text: 'replacement-private-token',
    userMessageIds: ['first-message'],
  })
  expect(await events(active)).toContainEqual({
    type: 'assistant.completed',
    ...context,
    messageId: 'after-delete',
    text: 'replacement-private-token',
    userMessageIds: ['first-message'],
  })
})

it('filters temporary values for their lifetime and prunes saved copies at expiry', async () => {
  const active = (f = await secretFixture(bundle))
  const context = {
    sessionId: 'first-session',
    turnId: 'first-turn',
    messageId: 'temporary-answer',
  }
  const pending = await active.waiting({ names: ['TOKEN'], command: 'deploy' })
  await active.answer(pending.request.id, {
    kind: 'values',
    lifetime: '15-minutes',
    values: { TOKEN: 'short-private-token' },
  })
  expect((await pending.response).status).toBe(200)
  await active.emit({ type: 'assistant.delta', ...context, text: 'short-' })
  const actor = await active.secretActor()
  expect(await actor.savedFilterState()).toContain('short-private-token')
  await actor.advanceSecretClock(DEVICE_TEST_NOW + 900_000)
  expect(await actor.savedFilterState()).not.toContain('short-private-token')
  expect(await actor.storedSecretState()).not.toContain('short-private-token')
  await active.emit({
    type: 'assistant.completed',
    ...context,
    text: 'short-private-token',
    userMessageIds: ['first-message'],
  })
  expect(await events(active)).toContainEqual({
    type: 'assistant.completed',
    ...context,
    text: 'short-private-token',
    userMessageIds: ['first-message'],
  })
})

it('removes a workspace value, its grant and its saved filter copies', async () => {
  const active = (f = await secretFixture(bundle))
  const context = {
    sessionId: 'first-session',
    turnId: 'first-turn',
    messageId: 'workspace-answer',
  }
  const actor = await active.secretActor()
  const workspace = await active.waiting({
    names: ['TOKEN'],
    command: 'deploy',
  })
  await active.answer(workspace.request.id, {
    kind: 'values',
    lifetime: 'workspace',
    values: { TOKEN: 'workspace-private-token' },
  })
  expect((await workspace.response).status).toBe(200)
  await active.emit({
    type: 'assistant.delta',
    ...context,
    messageId: 'workspace-answer',
    text: 'workspace-',
  })
  expect(await actor.savedFilterState()).toContain('workspace-private-token')
  const value = (await active.listRequests()).workspaceValues[0]
  const removed = await active.request(
    workspaceSecretValuePath(OUTER_ORG, OUTER_WORKSPACE, value.id),
    { method: 'DELETE' },
  )
  expect(removed.status).toBe(204)
  expect(await actor.savedFilterState()).not.toContain(
    'workspace-private-token',
  )
  const again = await active.waiting({ names: ['TOKEN'], command: 'deploy' })
  await active.answer(again.request.id, { kind: 'deny' })
  expect(await (await again.response).json()).toMatchObject({
    status: 'denied',
  })
})
