import { expect, it } from 'vitest'

import {
  claudeReply,
  continueFixture,
  wakeContinueFixture,
} from '../../test-support/claude-continue'
import { turn } from '../../test-support/input'
import { string } from '../parse'

it('keeps every consumed member ID on untagged frames of a merged continued reply', async () => {
  const h = await continueFixture()
  await h.drop()
  const continued = string((await h.sdk.nextUser()).uuid)
  await h.provider.send(turn('2'))
  const member = string((await h.sdk.nextUser()).uuid)
  await claudeReply(h, 'merged-answer', {
    uuids: [continued, member],
    thinking: true,
    text: 'The connection dropped. I answer both messages.',
  })
  await h.sdk.raw({
    type: 'result',
    is_error: false,
    user_message_uuids: [continued, member],
  })
  expect(h.events.filter((event) => event.type === 'answer')).toEqual([
    {
      type: 'answer',
      messageId: 'merged-answer',
      text: 'The connection dropped. I answer both messages.',
      userMessageIds: ['message-1', 'message-2'],
    },
  ])
  expect(h.ends()).toEqual([
    {
      type: 'result',
      state: 'finished',
      userMessageIds: ['message-1', 'message-2'],
    },
  ])
})

it('keeps a member reply association across tool rounds before the queued continuation', async () => {
  const h = await continueFixture()
  await h.drop()
  const continued = string((await h.sdk.nextUser()).uuid)
  await h.provider.send(turn('2'))
  const member = string((await h.sdk.nextUser()).uuid)
  await claudeReply(h, 'member-call', {
    uuids: [member],
    text: 'I run a command for the new message.',
    tool: 'member-tool',
  })
  await claudeReply(h, 'member-answer', { text: 'The command passed.' })
  await h.sdk.raw({
    type: 'result',
    is_error: false,
    user_message_uuid: member,
  })
  await claudeReply(h, 'continued-answer', {
    uuids: [continued],
    text: 'The connection dropped. I continue.',
  })
  await h.sdk.raw({
    type: 'result',
    is_error: false,
    user_message_uuid: continued,
  })
  expect(h.events.filter((event) => event.type === 'answer')).toEqual([
    {
      type: 'answer',
      messageId: 'member-call',
      text: 'I run a command for the new message.',
      userMessageIds: ['message-2'],
    },
    {
      type: 'answer',
      messageId: 'member-answer',
      text: 'The command passed.',
      userMessageIds: ['message-2'],
    },
    {
      type: 'answer',
      messageId: 'continued-answer',
      text: 'The connection dropped. I continue.',
      userMessageIds: ['message-1'],
    },
  ])
  expect(h.ends()).toEqual([
    { type: 'result', state: 'finished', userMessageIds: ['message-2'] },
    { type: 'result', state: 'finished', userMessageIds: ['message-1'] },
  ])
})

it('does not let an untagged notification result claim a waiting wake-up continuation', async () => {
  const h = await wakeContinueFixture()
  await h.provider.send(turn('2'))
  const member = string((await h.sdk.nextUser()).uuid)
  await h.sdk.raw({
    type: 'result',
    is_error: false,
    origin: { kind: 'task-notification' },
  })
  await claudeReply(h, 'continued-answer', {
    uuids: [h.continued],
    text: 'The connection dropped. I continue.',
  })
  await h.sdk.raw({
    type: 'result',
    is_error: false,
    user_message_uuids: [h.continued],
  })
  expect(h.ends()).toEqual([
    { type: 'result', state: 'finished', userMessageIds: ['message-1'] },
    { type: 'wake-up', state: 'finished' },
  ])
  await claudeReply(h, 'member-answer', {
    uuids: [member],
    text: 'I answer the new message.',
  })
  await h.sdk.raw({
    type: 'result',
    is_error: false,
    user_message_uuid: member,
  })
  expect(h.events.filter((event) => event.type === 'answer')).toEqual([
    {
      type: 'answer',
      messageId: 'continued-answer',
      text: 'The connection dropped. I continue.',
      userMessageIds: [],
    },
    {
      type: 'answer',
      messageId: 'member-answer',
      text: 'I answer the new message.',
      userMessageIds: ['message-2'],
    },
  ])
  expect(h.ends()).toEqual([
    { type: 'result', state: 'finished', userMessageIds: ['message-1'] },
    { type: 'wake-up', state: 'finished' },
    { type: 'result', state: 'finished', userMessageIds: ['message-2'] },
  ])
})
