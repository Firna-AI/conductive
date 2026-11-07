import { afterEach, beforeAll, expect, it } from 'vitest'

import { chatHistoryPath } from '../../../src/shared/events'
import { sessionsPath } from '../../../src/shared/sessions'
import { outerWorkerBundle } from './outer-runtime.test-support'
import { OUTER_ORG, OUTER_WORKSPACE } from './outer-seed.test-support'
import { createLifecycleChatFixture } from './workspace-lifecycle.test-support'

let bundle: string
let fixture: Awaited<ReturnType<typeof createLifecycleChatFixture>> | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle()
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

it('stores the assigned first message during lifecycle admission before any browser callback and keeps repeats durable', async () => {
  const active = (fixture = await createLifecycleChatFixture(bundle))
  await active.initialize()
  const sessions = await active.request(
    sessionsPath(OUTER_ORG, OUTER_WORKSPACE),
  )
  expect(sessions.status).toBe(200)
  expect(await sessions.json()).toMatchObject({
    sessions: [{ id: 'first-session', activeTurnId: 'first-turn' }],
    history: [],
  })
  const read = () =>
    active.request(chatHistoryPath(OUTER_ORG, OUTER_WORKSPACE, 'first-session'))
  const history = await read()
  expect(history.status).toBe(200)
  const before: unknown = await history.json()
  expect(before).toMatchObject({
    events: expect.arrayContaining([
      expect.objectContaining({
        event: expect.objectContaining({
          type: 'message.accepted',
          message: expect.objectContaining({
            id: 'first-message',
            text: 'Keep the first message',
            state: 'queued',
          }),
        }),
      }),
    ]),
  })
  const accepted = await fixture
    .actor()
    .acceptLifecycleFirstMessage(fixture.first)
  expect(accepted).toMatchObject({
    id: 'first-message',
    sessionId: 'first-session',
    state: 'queued',
    sender: { id: 'owner' },
  })
  const expected = {
    id: 'first-message',
    sessionId: 'first-session',
    state: 'queued',
    sender: {
      id: 'owner',
      githubLogin: 'owner',
      displayName: null,
      avatarUrl: null,
    },
    choice: active.first.request.choice,
    text: 'Keep the first message',
    attachments: [],
    createdAt: accepted.createdAt,
  }
  expect(accepted).toEqual(expected)
  await fixture.initialize()
  expect(await (await read()).json()).toEqual(before)
  await active.restart()
  expect(
    await fixture.actor().acceptLifecycleFirstMessage(fixture.first),
  ).toEqual(expected)
  expect(await (await read()).json()).toEqual(before)
  expect(JSON.stringify(before)).not.toContain('outer-secret-owner')
})
