import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { sessionPath } from '../../src/shared/sessions'
import { createHarness, type TestHarness } from '../test-support/harness'
import { createFirstMessageFixture } from './first-message.test-support'
import { WORKSPACE_ID } from './harness.test-support'
import { sessionRecord } from './retry.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

it('keeps a member name given to the first session before the workspace title', async () => {
  const { fixture, first, acceptFirst } =
    await createFirstMessageFixture(harness)
  await acceptFirst()
  const renamed = await fixture.fetch(
    sessionPath(fixture.org.id, WORKSPACE_ID, first.sessionId),
    { title: 'delft' },
    fixture.memberCookie,
    'PATCH',
  )
  expect(renamed.status).toBe(200)
  const tab = await fixture.tab()
  const runner = await fixture.connect()
  runner.emit({ type: 'workspace.title', name: 'Fix chat titles' })
  await fixture.drain()
  expect((await sessionRecord(fixture, first.sessionId)).title).toBe('delft')
  expect(
    tab.messages
      .filter((message) => message.type === 'event')
      .map(({ envelope }) => envelope.event.type),
  ).toEqual(['workspace.title'])
  await tab.close()
})
