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

it('renames only the first session on the first workspace title and publishes ordered updates to both tabs', async () => {
  const { fixture, first, acceptFirst } =
    await createFirstMessageFixture(harness)
  await acceptFirst()
  const later = await fixture.createSession()
  fixture.restart()
  const ownerTab = await fixture.tab()
  const memberTab = await fixture.tab(0, undefined, fixture.memberCookie)
  const runner = await fixture.connect()
  const title = runner.emit({
    type: 'workspace.title',
    name: 'Fix chat titles',
  })
  await fixture.drain()
  expect((await sessionRecord(fixture, first.sessionId)).title).toBe(
    'Fix chat titles',
  )
  expect((await sessionRecord(fixture, later.id)).title).toBe('New session')
  const events = ownerTab.messages.filter((message) => message.type === 'event')
  expect(
    events.map(({ envelope }) => [envelope.eventNumber, envelope.event.type]),
  ).toEqual([
    [5, 'workspace.title'],
    [6, 'session.updated'],
  ])
  expect(events[1].envelope.event).toMatchObject({
    type: 'session.updated',
    session: { id: first.sessionId, title: 'Fix chat titles' },
  })
  expect(memberTab.messages).toEqual(ownerTab.messages)
  const history = await fixture.history(first.sessionId)
  runner.sendEnvelope(title)
  await fixture.drain()
  expect(await fixture.history(first.sessionId)).toEqual(history)
  expect(
    ownerTab.messages.filter((message) => message.type === 'event'),
  ).toEqual(events)
  await fixture.fetch(
    sessionPath(fixture.org.id, WORKSPACE_ID, first.sessionId),
    { title: 'delft' },
    fixture.memberCookie,
    'PATCH',
  )
  runner.disconnect()
  fixture.restart()
  await fixture.connect(runner)
  runner.emit({ type: 'workspace.title', name: 'A later title' })
  await fixture.drain()
  expect((await sessionRecord(fixture, first.sessionId)).title).toBe('delft')
  ownerTab.close()
  memberTab.close()
})

it('keeps a member name given to the first session before the workspace title', async () => {
  const { fixture, first, acceptFirst } =
    await createFirstMessageFixture(harness)
  await acceptFirst()
  const renamed = await fixture.fetch(
    sessionPath(fixture.org.id, WORKSPACE_ID, first.sessionId),
    { title: 'Member session name' },
    fixture.memberCookie,
    'PATCH',
  )
  expect(renamed.status).toBe(200)
  const tab = await fixture.tab()
  const runner = await fixture.connect()
  runner.emit({ type: 'workspace.title', name: 'Fix chat titles' })
  await fixture.drain()
  expect((await sessionRecord(fixture, first.sessionId)).title).toBe(
    'Member session name',
  )
  expect(
    tab.messages
      .filter((message) => message.type === 'event')
      .map(({ envelope }) => envelope.event.type),
  ).toEqual(['workspace.title'])
  tab.close()
})
