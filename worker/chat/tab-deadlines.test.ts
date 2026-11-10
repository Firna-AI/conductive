import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import {
  workspaceEventsPath,
  type WorkspaceSocketMessage,
} from '../../src/shared/events'
import { HttpError } from '../http'
import { barrier } from '../previews/stream-test-support'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { readConnectionAccess } from '../security/connection-access'
import { createChatFixture, WORKSPACE_ID } from './harness.test-support'
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
it('expires an idle tab while its access read waits and ignores the late result', async () => {
  const entered = barrier<void>()
  const release = barrier<void>()
  const fixture = await createChatFixture(harness, {
    readConnectionAccess: async (identities, now) => {
      const result = await readConnectionAccess(harness.env.DB, identities, now)
      if (now > TEST_TIME) {
        entered.resolve()
        await release.promise
      }
      return result
    },
  })
  const tab = await fixture.tab()
  const pending = fixture.clock.advance(30000)
  await entered.promise
  await fixture.clock.advance(TEST_TIME + 29999 - fixture.clock.now())
  const beforeDeadline = tab.closed
  await fixture.clock.advance(1)
  const atDeadline = tab.closed
  release.resolve()
  await pending
  const count = tab.messages.length
  await fixture.appendWorkspaceEvent(WORKSPACE_ID, {
    type: 'workspace.title',
    name: 'After the expired grant',
  })
  expect(beforeDeadline).toBe(0)
  expect(atDeadline).toBe(1)
  expect(tab.messages).toHaveLength(count)
  expect(await fixture.clock.scheduledCount()).toBe(0)
  await tab.close()
})
it('sends no history when the session expires while history is read', async () => {
  const fixture = await createChatFixture(harness)
  await fixture.appendWorkspaceEvent(WORKSPACE_ID, {
    type: 'workspace.title',
    name: 'Private history',
  })
  await harness.env.DB.prepare('UPDATE sessions SET expires_at = ?')
    .bind(TEST_TIME + 10000)
    .run()
  const entered = barrier<void>()
  const release = barrier<void>()
  await fixture.setStorageHooks({
    afterList: async () => {
      entered.resolve()
      await release.promise
    },
  })
  const messages: WorkspaceSocketMessage[] = []
  let closed = 0
  const pending = fixture
    .openBrowser(
      fixture.request(workspaceEventsPath(fixture.org.id, WORKSPACE_ID)),
      {
        send: (message) => messages.push(message),
        close: () => {
          closed++
        },
      },
    )
    .then(
      () => null,
      (error: unknown) => error,
    )
  await entered.promise
  await fixture.clock.advance(10000)
  release.resolve()
  const error = await pending
  expect(messages).toEqual([])
  expect(closed).toBe(1)
  expect(error).toBeInstanceOf(HttpError)
  expect(error).toMatchObject({ status: 404, code: 'workspace_not_found' })
  expect(await fixture.clock.scheduledCount()).toBe(0)
})
it('sends no history when the initial access read outlasts its grant', async () => {
  const fixture = await createChatFixture(harness, {
    readConnectionAccess: async (identities, now) => {
      const result = await readConnectionAccess(harness.env.DB, identities, now)
      await fixture.clock.advance(30000)
      return result
    },
  })
  const messages: WorkspaceSocketMessage[] = []
  const error = await fixture
    .openBrowser(
      fixture.request(workspaceEventsPath(fixture.org.id, WORKSPACE_ID)),
      {
        send: (message) => messages.push(message),
        close: () => undefined,
      },
    )
    .then(
      () => null,
      (error: unknown) => error,
    )
  expect(messages).toEqual([])
  expect(error).toBeInstanceOf(HttpError)
  expect(error).toMatchObject({ status: 404, code: 'workspace_not_found' })
  expect(await fixture.clock.scheduledCount()).toBe(0)
})
