import { expect, it } from 'vitest'

import {
  continueFixture,
  continueText,
} from '../../test-support/claude-continue'
import { turn } from '../../test-support/input'
import { string } from '../parse'

it('continues at a full input window and frees only the original member messages after the answer', async () => {
  const h = await continueFixture()
  for (let id = 2; id <= 65; id++) await h.provider.send(turn(String(id)))
  const sent = [h.uuid]
  for (let id = 2; id <= 64; id++)
    sent.push(string((await h.sdk.nextUser()).uuid))
  await h.drop({ user_message_uuids: [sent[1], sent[0]] })
  expect(h.ends()).toEqual([])
  const continued = await h.sdk.nextUser()
  expect(continued.message).toEqual({ role: 'user', content: continueText })
  await h.provider.send(turn('66'))
  let delivered = false
  const pending = h.sdk.nextInput().then((input) => {
    delivered = !input.done
    return input
  })
  await h.sdk.raw({ type: 'system', subtype: 'init' })
  expect(delivered).toBe(false)
  await h.sdk.raw({
    type: 'result',
    is_error: false,
    user_message_uuids: [continued.uuid],
  })
  expect((await pending).done).toBe(false)
  const secondHeld = await h.sdk.nextUser()
  expect(h.ends()).toEqual([
    {
      type: 'result',
      state: 'finished',
      userMessageIds: ['message-2', 'message-1'],
    },
  ])
  await h.provider.send(turn('67'))
  let nextDelivered = false
  const next = h.sdk.nextInput().then((input) => {
    nextDelivered = !input.done
    return input
  })
  await h.sdk.raw({
    type: 'result',
    is_error: false,
    user_message_uuids: [sent[0], sent[1], continued.uuid],
  })
  expect(nextDelivered).toBe(false)
  await h.sdk.raw({
    type: 'result',
    is_error: false,
    user_message_uuid: secondHeld.uuid,
  })
  expect((await next).done).toBe(false)
})

it('returns to a background wait after the continued member reply finishes', async () => {
  const h = await continueFixture()
  await h.tasks()
  await h.drop()
  expect(h.ends()).toEqual([])
  const continued = await h.sdk.nextUser()
  await h.sdk.raw({
    type: 'result',
    is_error: false,
    user_message_uuid: continued.uuid,
  })
  await h.sdk.raw({
    type: 'result',
    is_error: false,
    origin: { kind: 'task-notification' },
    user_message_uuids: [],
  })
  expect(h.ends()).toEqual([
    { type: 'result', state: 'finished', userMessageIds: ['message-1'] },
    { type: 'wake-up', state: 'finished' },
  ])
})

it('keeps a continued wake-up as a wake-up when new member input arrives', async () => {
  const h = await continueFixture()
  await h.tasks()
  await h.sdk.raw({
    type: 'result',
    is_error: false,
    user_message_uuid: h.uuid,
  })
  await h.drop({
    origin: { kind: 'task-notification' },
    user_message_uuids: [],
  })
  expect(h.ends()).toEqual([
    { type: 'result', state: 'finished', userMessageIds: ['message-1'] },
  ])
  const continued = await h.sdk.nextUser()
  expect(continued.message).toEqual({ role: 'user', content: continueText })
  await h.provider.send(turn('2'))
  const member = await h.sdk.nextUser()
  await h.stream(
    { type: 'message_start', message: { id: 'wake-answer' } },
    { user_message_uuid: continued.uuid },
  )
  await h.stream(
    {
      type: 'content_block_delta',
      delta: {
        type: 'text_delta',
        text: 'The connection dropped. I continue.',
      },
    },
    { user_message_uuid: continued.uuid },
  )
  await h.sdk.raw({
    type: 'result',
    is_error: false,
    user_message_uuid: continued.uuid,
  })
  expect(h.ends()).toEqual([
    { type: 'result', state: 'finished', userMessageIds: ['message-1'] },
    { type: 'wake-up', state: 'finished' },
  ])
  expect(h.events.filter((event) => event.type === 'answer')).toEqual([
    {
      type: 'answer',
      messageId: 'wake-answer',
      text: 'The connection dropped. I continue.',
      userMessageIds: [],
    },
  ])
  await h.sdk.raw({
    type: 'result',
    is_error: false,
    user_message_uuid: member.uuid,
  })
  expect(h.ends().at(-1)).toEqual({
    type: 'result',
    state: 'finished',
    userMessageIds: ['message-2'],
  })
})
