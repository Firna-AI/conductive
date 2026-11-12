import { expect, it } from 'vitest'

import { heldOperation } from '../test-support/held-operation'
import { setupBackendTests } from './backend-test-hooks'
import { FIRST_MESSAGE } from './durable-test-support'
import { startRetryFixture } from './retry-test-support'
import { expectSettled, outsideResumeJob } from './start-outside.test-support'

const fixtureForTest = setupBackendTests()

it('reads chat history while a start status reply is held', async () => {
  const fixture = fixtureForTest()
  const start = await startRetryFixture(fixture)
  const job = await start.job()
  if (!job) throw new Error('Missing start job')
  const actor = fixture.actors.get(job.workspaceId)
  if (!actor) throw new Error('Missing workspace actor')
  const held = heldOperation()
  const order: string[] = []
  fixture.boat.beforeStatus = async () => {
    order.push('reply-held')
    await held.wait()
    order.push('reply-released')
  }
  const advancing = start.advance()
  try {
    await expectSettled(held.entered)
    const history = await expectSettled(
      actor.native.api.controls.history(job.workspaceId),
    )
    order.push('history-read')
    expect(order).toEqual(['reply-held', 'history-read'])
    expect(
      history.events.filter(({ event }) => event.type === 'message.accepted'),
    ).toMatchObject([{ event: { message: { id: FIRST_MESSAGE.id } } }])
  } finally {
    held.release()
    await advancing
  }
  expect(order).toEqual(['reply-held', 'history-read', 'reply-released'])
})

it('refuses Resume without adding a start job while a start reply is held', async () => {
  const fixture = fixtureForTest()
  const start = await startRetryFixture(fixture)
  const job = await start.job()
  if (!job) throw new Error('Missing start job')
  const held = heldOperation()
  const order: string[] = []
  fixture.boat.beforeStatus = async () => {
    order.push('reply-held')
    await held.wait()
    order.push('reply-released')
  }
  const advancing = start.advance()
  let admission: Promise<boolean> | undefined
  try {
    await expectSettled(held.entered)
    admission = start.endpoint.queueLifecycleStart(
      outsideResumeJob(fixture, job.workspaceId, 'bx_1'),
    )
    expect(await expectSettled(admission)).toBe(false)
    order.push('resume-refused')
    expect(order).toEqual(['reply-held', 'resume-refused'])
    expect(await start.job()).toEqual(job)
  } finally {
    held.release()
    await Promise.all([advancing, admission])
  }
  expect(order).toEqual(['reply-held', 'resume-refused', 'reply-released'])
  expect((await start.job())?.attempt).toBe(job.attempt)
})
