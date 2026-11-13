import { afterAll, beforeAll, expect, it } from 'vitest'

import { sessionPaths } from '../../src/shared/sessions'
import { createHarness, type TestHarness } from '../test-support/harness'
import { CLAUDE, WORKSPACE_ID, createChatFixture } from './harness.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
afterAll(async () => {
  await harness.dispose()
})

it('keeps fast in session writes, queues a speed change, and rejects a changed message retry', async () => {
  const fixture = await createChatFixture(harness)
  await fixture.setEnvironment({
    CONDUCTIVE_MODELS: JSON.stringify([
      { ...CLAUDE, label: 'Claude', efforts: ['high'], fast: true },
    ]),
  })
  const selected = { ...CLAUDE, fast: true }
  const session = await fixture.createSession(selected)
  expect(session.choice).toEqual(selected)
  const reply = await fixture.send(
    session.id,
    'fast-message',
    fixture.ownerCookie,
    { ...selected, fast: false },
  )
  expect(reply.message.choice.fast).toBe(false)
  const pending = await fixture.chat.store.read(WORKSPACE_ID, (view) =>
    view.pending(),
  )
  expect(pending).toContainEqual(
    expect.objectContaining({
      type: 'model',
      choice: { ...selected, fast: false },
    }),
  )
  const retry = await fixture.fetch(
    sessionPaths.messages(fixture.org.id, WORKSPACE_ID, session.id),
    {
      id: 'fast-message',
      text: 'Check this code',
      choice: selected,
      attachmentIds: [],
    },
  )
  expect(retry.status).toBe(409)
  const change = await fixture.fetch(
    sessionPaths.model(fixture.org.id, WORKSPACE_ID, session.id),
    {
      choice: selected,
      draft: { text: '', attachmentIds: [] },
    },
    fixture.ownerCookie,
    'PUT',
  )
  expect(change.status).toBe(200)
  expect(await change.json()).toMatchObject({
    session: { choice: selected },
    created: false,
  })
  const unmarked = await fixture.createSession({
    ...selected,
    model: 'unmarked',
  })
  expect(unmarked.choice.fast).toBe(false)
})
