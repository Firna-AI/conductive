import { expect, it } from 'vitest'

import {
  continueFixture,
  continueText,
  dropText,
} from '../../test-support/claude-continue'
import { turn } from '../../test-support/input'

it('continues each pinned Claude drop text without failing or ending the request', async () => {
  for (const text of [
    dropText,
    'API Error: The response stopped arriving. The response above may be incomplete.',
    'API Error: Part of the response never arrived. The response above may be incomplete.',
    'API Error: The response stream was malformed. The response above may be incomplete.',
    'API Error: Connection lost before a response was produced. Try again.',
    'API Error: The response stream was malformed and no response was produced. Try again.',
  ]) {
    const h = await continueFixture()
    await h.drop({ errors: [text] })
    expect(h.ends()).toEqual([])
    const continued = await h.sdk.nextUser()
    expect(continued.message).toEqual({ role: 'user', content: continueText })
    expect(continued.uuid).not.toBe(h.uuid)
    expect(continued.parent_tool_use_id).toBe(null)
    expect(continued.priority).toBe('next')
    expect(h.sdk.closed).toBe(false)
    expect(h.warnings).toEqual([
      'The Claude answer stream dropped. Continuing the agent once.',
    ])
    await h.sdk.raw({
      type: 'result',
      subtype: 'success',
      is_error: false,
      user_message_uuid: continued.uuid,
    })
    expect(h.ends()).toEqual([
      { type: 'result', state: 'finished', userMessageIds: ['message-1'] },
    ])
  }
})

it('continues an unfinished main stream and keeps both partial and continued answers', async () => {
  const h = await continueFixture()
  await h.stream({ type: 'message_start', message: { id: 'cut-answer' } })
  await h.stream({
    type: 'content_block_delta',
    delta: { type: 'text_delta', text: 'Part of the reply.' },
  })
  await h.stream({ type: 'message_stop' }, { parent_tool_use_id: 'child' })
  await h.drop({ errors: ['The response transport ended unexpectedly.'] })
  expect(h.ends()).toEqual([])
  const continued = await h.sdk.nextUser()
  await h.stream(
    { type: 'message_start', message: { id: 'continued-answer' } },
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
  await h.sdk.raw({ type: 'result', is_error: false, user_message_uuids: [] })
  expect(h.events.filter((event) => event.type === 'answer')).toEqual([
    {
      type: 'answer',
      messageId: 'cut-answer',
      text: 'Part of the reply.',
      userMessageIds: ['message-1'],
    },
    {
      type: 'answer',
      messageId: 'continued-answer',
      text: 'The connection dropped. I continue.',
      userMessageIds: ['message-1'],
    },
  ])
  expect(h.ends()).toEqual([
    { type: 'result', state: 'finished', userMessageIds: ['message-1'] },
  ])
})

it('fails a second drop during the continue answer or a later request in the same process', async () => {
  for (const laterRequest of [false, true]) {
    const h = await continueFixture()
    await h.drop()
    expect(h.ends()).toEqual([])
    const continued = await h.sdk.nextUser()
    let uuid = continued.uuid
    if (laterRequest) {
      await h.sdk.raw({
        type: 'result',
        is_error: false,
        user_message_uuid: uuid,
      })
      await h.provider.send(turn('2'))
      uuid = (await h.sdk.nextUser()).uuid
    }
    await h.drop({ user_message_uuids: [uuid] })
    expect(h.ends().at(-1)).toEqual({
      type: 'failed',
      code: 'agent_failed',
      message: dropText,
    })
    expect(h.warnings).toEqual([
      'The Claude answer stream dropped. Continuing the agent once.',
    ])
    let delivered = false
    const pending = h.sdk.nextInput().then((input) => {
      delivered = !input.done
      return input
    })
    await h.sdk.raw({ type: 'system', subtype: 'init' })
    expect(delivered).toBe(false)
    await h.provider.close()
    expect(await pending).toEqual({ done: true, value: undefined })
  }
})
