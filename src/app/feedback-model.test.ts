import { expect, it } from 'vitest'

import { FEEDBACK_PATH } from '../shared/feedback'
import {
  feedbackFailure,
  feedbackFixture,
  feedbackLocation,
  feedbackScreenshot,
} from './feedback.test-support'
import { MemoryStorage, flushMicrotasks } from './test-kit'

it('sends one metadata-free request with explicit host context and clears the draft after success', async () => {
  const { model, held, sent, bodies, services } = feedbackFixture()
  await model.open(feedbackLocation)
  expect(model.state.get().reply).toEqual({
    state: 'ready',
    value: { replyEmail: 'mira@example.com' },
  })
  model.setText('The terminal closes.')
  model.addScreenshot(feedbackScreenshot)
  model.addScreenshot({ ...feedbackScreenshot, name: 'remove.png' })
  const remove = model.state.get().draft.screenshots[1].id
  model.removeScreenshot(remove)
  expect(model.state.get().draft.screenshots.map(({ name }) => name)).toEqual([
    'screen.png',
  ])
  held.holdAnswer('POST', FEEDBACK_PATH)
  const sending = model.send()
  expect(model.send()).toBe(sending)
  expect(model.state.get().send).toEqual({ state: 'sending' })
  model.close()
  expect(model.state.get().open).toBe(true)
  await flushMicrotasks()
  expect(sent()).toHaveLength(1)
  expect(await bodies()).toEqual([
    {
      draftId: 'client-1',
      text: 'The terminal closes.',
      context: { ...feedbackLocation, appVersion: '0.5.0 (abcd123)' },
      screenshots: [{ content: 'iVBORw0KGgo=' }],
    },
  ])
  held.release('POST', FEEDBACK_PATH)
  expect(await sending).toBe(true)
  expect(model.state.get()).toMatchObject({
    open: false,
    draft: { id: null, text: '', screenshots: [] },
    send: { state: 'idle' },
  })
  model.setText('Another message.')
  expect(model.state.get().draft.id).not.toBe('client-1')
  expect(services.storage).toBeInstanceOf(MemoryStorage)
  expect(
    services.storage instanceof MemoryStorage
      ? [...services.storage.values]
      : null,
  ).toEqual([])
})

it('keeps failed drafts on close and retries exact data until an edit takes a fresh context snapshot', async () => {
  const { model, server, services, bodies, sent } = feedbackFixture()
  server.json('POST', FEEDBACK_PATH, feedbackFailure, 502)
  await model.open(feedbackLocation)
  model.setText('The terminal closes.')
  model.addScreenshot(feedbackScreenshot)
  const draft = model.state.get().draft
  expect(await model.send()).toBe(false)
  expect(model.state.get()).toMatchObject({
    open: true,
    draft,
    send: {
      state: 'failed',
      error: {
        status: 502,
        code: 'feedback_email_failed',
        message: 'The feedback email could not be sent. Try again.',
      },
    },
  })
  model.close()
  expect(model.state.get()).toMatchObject({ open: false, draft })
  services.appVersion = '0.5.1 (ef12345)'
  const nextLocation = { orgId: 'futex', workspaceId: null, desktop: true }
  await model.open(nextLocation)
  expect(await model.send()).toBe(false)
  const retries = await bodies()
  expect(retries[1]).toEqual(retries[0])
  expect(await sent()[1].clone().text()).toBe(await sent()[0].clone().text())
  model.setText('The terminal still closes.')
  server.empty('POST', FEEDBACK_PATH)
  expect(await model.send()).toBe(true)
  const changed = (await bodies())[2]
  expect(changed).toEqual({
    draftId: draft.id,
    text: 'The terminal still closes.',
    context: { ...nextLocation, appVersion: '0.5.1 (ef12345)' },
    screenshots: [{ content: 'iVBORw0KGgo=' }],
  })
  expect(changed).not.toEqual(retries[0])
  expect(model.state.get().draft).toEqual({
    id: null,
    text: '',
    screenshots: [],
  })
})

it('keeps the draft while reply details load or fail and permits send after a ready null reply', async () => {
  const { model, server, held, sent } = feedbackFixture()
  server.json('GET', FEEDBACK_PATH, { replyEmail: 47 })
  held.holdAnswer('GET', FEEDBACK_PATH)
  const opening = model.open(feedbackLocation)
  model.setText('Please help with the terminal.')
  model.addScreenshot(feedbackScreenshot)
  const draft = model.state.get().draft
  expect(model.state.get().reply).toEqual({ state: 'loading' })
  expect(model.canSend).toBe(false)
  expect(await model.send()).toBe(false)
  expect(sent()).toHaveLength(0)
  held.release('GET', FEEDBACK_PATH)
  await opening
  expect(model.state.get().reply).toMatchObject({
    state: 'failed',
    error: { code: 'invalid_response' },
  })
  expect(model.state.get().draft).toEqual(draft)
  expect(model.canSend).toBe(false)
  expect(await model.send()).toBe(false)
  expect(sent()).toHaveLength(0)
  server.json('GET', FEEDBACK_PATH, {})
  await model.readReply()
  expect(model.state.get().reply).toMatchObject({
    state: 'failed',
    error: { code: 'invalid_response' },
  })
  server.json('GET', FEEDBACK_PATH, { replyEmail: null })
  await model.readReply()
  expect(model.state.get().reply).toEqual({
    state: 'ready',
    value: { replyEmail: null },
  })
  expect(model.state.get().draft).toEqual(draft)
  expect(model.canSend).toBe(true)
  expect(await model.send()).toBe(true)
  expect(sent()).toHaveLength(1)
})
