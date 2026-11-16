import { expect, it } from 'vitest'

import {
  claudeReply,
  wakeContinueFixture,
} from '../../test-support/claude-continue'
import { turn } from '../../test-support/input'
import { string } from '../parse'

it.each(['continue-first', 'member-first'] as const)(
  'answers all member input in a merged wake-up continuation with %s',
  async (order) => {
    const h = await wakeContinueFixture()
    await h.provider.send(turn('2'))
    const member = string((await h.sdk.nextUser()).uuid)
    await h.provider.send(turn('3'))
    const nextMember = string((await h.sdk.nextUser()).uuid)
    const uuids =
      order === 'continue-first'
        ? [h.continued, member, nextMember]
        : [member, nextMember, h.continued]
    await claudeReply(h, 'merged-answer', {
      uuids,
      thinking: true,
      text: 'The connection dropped. I answer both messages.',
    })
    await h.sdk.raw({
      type: 'result',
      is_error: false,
      user_message_uuids: uuids,
    })
    expect(h.events.filter((event) => event.type === 'answer')).toEqual([
      {
        type: 'answer',
        messageId: 'merged-answer',
        text: 'The connection dropped. I answer both messages.',
        userMessageIds: ['message-2', 'message-3'],
      },
    ])
    expect(h.ends()).toEqual([
      { type: 'result', state: 'finished', userMessageIds: ['message-1'] },
      {
        type: 'result',
        state: 'finished',
        userMessageIds: ['message-2', 'message-3'],
      },
    ])
    await h.sdk.raw({
      type: 'system',
      subtype: 'background_tasks_changed',
      tasks: [],
    })
    await h.sdk.raw({
      type: 'result',
      is_error: false,
      origin: { kind: 'task-notification' },
    })
    expect(h.ends()).toEqual([
      { type: 'result', state: 'finished', userMessageIds: ['message-1'] },
      {
        type: 'result',
        state: 'finished',
        userMessageIds: ['message-2', 'message-3'],
      },
      { type: 'wake-up', state: 'finished' },
    ])
  },
)

it('answers member input folded between tool rounds of a continued wake-up', async () => {
  const h = await wakeContinueFixture()
  await claudeReply(h, 'continued-call', {
    uuids: [h.continued],
    text: 'The connection dropped. I run a command.',
    tool: 'continued-tool',
  })
  await h.provider.send(turn('2'))
  const member = string((await h.sdk.nextUser()).uuid)
  await claudeReply(h, 'folded-answer', {
    uuids: [h.continued, member],
    text: 'The command passed. I answer the new message.',
  })
  await h.sdk.raw({
    type: 'result',
    is_error: false,
    origin: { kind: 'task-notification' },
    user_message_uuids: [h.continued, member],
  })
  expect(h.events.filter((event) => event.type === 'answer')).toEqual([
    {
      type: 'answer',
      messageId: 'continued-call',
      text: 'The connection dropped. I run a command.',
      userMessageIds: [],
    },
    {
      type: 'answer',
      messageId: 'folded-answer',
      text: 'The command passed. I answer the new message.',
      userMessageIds: ['message-2'],
    },
  ])
  expect(h.ends()).toEqual([
    { type: 'result', state: 'finished', userMessageIds: ['message-1'] },
    { type: 'result', state: 'finished', userMessageIds: ['message-2'] },
  ])
  await h.sdk.raw({
    type: 'result',
    is_error: false,
    origin: { kind: 'task-notification' },
    user_message_uuids: [],
  })
  expect(h.ends().at(-1)).toEqual({ type: 'wake-up', state: 'finished' })
})
