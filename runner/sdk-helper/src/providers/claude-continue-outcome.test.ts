import { expect, it } from 'vitest'

import { continueFixture, dropText } from '../../test-support/claude-continue'

it('keeps other errors and login failures immediate while allowing a later process to continue', async () => {
  for (const scenario of [
    { stream: 'none', text: 'The request is invalid.', login: false },
    { stream: 'closed', text: 'The request is invalid.', login: false },
    { stream: 'child', text: 'The request is invalid.', login: false },
    { stream: 'open', text: dropText, login: true },
    { stream: 'open', text: 'Authentication failed.', login: true },
  ]) {
    const h = await continueFixture()
    if (scenario.stream !== 'none')
      await h.stream(
        { type: 'message_start', message: { id: 'answer' } },
        scenario.stream === 'child' ? { parent_tool_use_id: 'child' } : {},
      )
    if (scenario.stream === 'closed') await h.stream({ type: 'message_stop' })
    if (scenario.text === dropText)
      await h.sdk.raw({
        type: 'assistant',
        error: 'authentication_failed',
        message: { id: 'login-error', content: [] },
      })
    await h.drop({ errors: [scenario.text] })
    expect(h.ends()).toEqual([
      scenario.login
        ? {
            type: 'failed',
            code: 'agent_authentication_failed',
            message: 'The agent login failed. Reconnect your agent account.',
          }
        : { type: 'failed', code: 'agent_failed', message: scenario.text },
    ])
    expect(h.warnings).toEqual([])
  }
  const h = await continueFixture()
  await h.drop()
  expect(h.ends()).toEqual([])
  const continued = await h.sdk.nextUser()
  await h.sdk.raw({
    type: 'result',
    is_error: true,
    errors: ['The request is invalid.'],
    user_message_uuid: continued.uuid,
  })
  expect(h.ends()).toEqual([
    {
      type: 'failed',
      code: 'agent_failed',
      message: 'The request is invalid.',
    },
  ])
})

it('keeps the fixed usage limit cause of Claude without a reset time', async () => {
  const h = await continueFixture()
  await h.drop({ errors: ['Usage limit reached. Try again at 5:00 PM.'] })
  expect(h.ends()).toEqual([
    {
      type: 'failed',
      code: 'agent_usage_limit',
      message:
        'The agent account reached its usage limit. Check your agent account.',
    },
  ])
})

it('keeps Stop before a drop and during the continue answer as stopped', async () => {
  const before = await continueFixture()
  await before.provider.interrupt()
  await before.drop()
  expect(before.ends()).toEqual([
    { type: 'result', state: 'stopped', userMessageIds: ['message-1'] },
  ])
  expect(before.warnings).toEqual([])

  const h = await continueFixture()
  await h.drop()
  expect(h.ends()).toEqual([])
  const continued = await h.sdk.nextUser()
  await h.provider.interrupt()
  await h.drop({ user_message_uuids: [continued.uuid] })
  expect(h.ends()).toEqual([
    { type: 'result', state: 'stopped', userMessageIds: ['message-1'] },
  ])
  expect(h.sdk.interrupts).toBe(1)
})
