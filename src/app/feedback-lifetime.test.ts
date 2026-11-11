import { expect, it } from 'vitest'

import { FEEDBACK_PATH } from '../shared/feedback'
import { fakeUsers } from '../test-support/fixtures/core'
import {
  feedbackFixture,
  feedbackLocation,
  feedbackScreenshot,
} from './feedback.test-support'
import { flushMicrotasks } from './test-kit'

it('clears private feedback on sign-out and ignores an old reply address after another user opens feedback', async () => {
  const { model, app, held, server, sent } = feedbackFixture()
  held.holdAnswer('GET', FEEDBACK_PATH)
  const oldRead = model.open(feedbackLocation)
  model.setText('Private first-person feedback.')
  model.addScreenshot(feedbackScreenshot)
  expect(model.state.get().draft.text).toBe('Private first-person feedback.')
  await flushMicrotasks()
  app.boot.set({ state: 'signed-out' })
  expect(model.state.get()).toMatchObject({
    open: false,
    reply: null,
    draft: { id: null, text: '', screenshots: [] },
  })
  model.setText('Cannot write while signed out.')
  expect(await model.send()).toBe(false)
  expect(sent()).toHaveLength(0)
  app.boot.set({ state: 'ready', user: fakeUsers[1] })
  server.json('GET', FEEDBACK_PATH, { replyEmail: 'second@example.com' })
  await model.open(feedbackLocation)
  held.release('GET', FEEDBACK_PATH)
  await oldRead
  expect(model.state.get().reply).toEqual({
    state: 'ready',
    value: { replyEmail: 'second@example.com' },
  })
  expect(model.state.get().draft.text).toBe('')
})

it('ignores stale send results across user changes and keeps a newer user send active', async () => {
  const { model, app, held, server } = feedbackFixture()
  await model.open(feedbackLocation)
  model.setText('First-person feedback.')
  held.holdAnswer('POST', FEEDBACK_PATH)
  const oldSend = model.send()
  await flushMicrotasks()
  app.boot.set({ state: 'ready', user: fakeUsers[1] })
  expect(model.state.get()).toMatchObject({
    open: false,
    reply: null,
    draft: { id: null, text: '', screenshots: [] },
  })
  server.json('GET', FEEDBACK_PATH, { replyEmail: null })
  await model.open({ ...feedbackLocation, desktop: true })
  model.setText('Second-person feedback.')
  held.holdAnswer('POST', FEEDBACK_PATH)
  const newSend = model.send()
  await flushMicrotasks()
  held.release('POST', FEEDBACK_PATH)
  expect(await oldSend).toBe(false)
  expect(model.state.get()).toMatchObject({
    open: true,
    draft: { text: 'Second-person feedback.' },
    send: { state: 'sending' },
  })
  expect(model.send()).toBe(newSend)
  held.release('POST', FEEDBACK_PATH)
  expect(await newSend).toBe(true)
  expect(model.state.get()).toMatchObject({
    open: false,
    draft: { text: '' },
    send: { state: 'idle' },
  })
})
