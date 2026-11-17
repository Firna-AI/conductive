import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { sessionPaths } from '../../src/shared/sessions'
import { createHarness, type TestHarness } from '../test-support/harness'
import { isRecord } from '../http'
import { CLAUDE, CODEX, createChatFixture } from './harness.test-support'
import { saveChatOrgLogin, preferChatOrgLogin } from './org-login.test-support'
import { sessionRecord } from './retry.test-support'
import { startTurn, terminalEvent } from './turn-lifecycle.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

it('keeps the personal login of an older session with messages and takes the current default for an older empty session', async () => {
  const fixture = await createChatFixture(harness)
  const old = await fixture.createSession()
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  const turn = await startTurn(fixture, runner, old.id, 'old-message')
  runner.emit(terminalEvent(turn, 'finished'))
  await fixture.drain()
  const empty = await fixture.createSession()
  for (const [key, value] of (await fixture.snapshot()).records) {
    if (
      isRecord(value) &&
      (value.id === old.id || value.id === empty.id) &&
      'choice' in value
    ) {
      const record = { ...value }
      delete record.login
      await fixture.storage.put(key, record)
    }
  }
  await saveChatOrgLogin(harness, fixture)
  await preferChatOrgLogin(harness, fixture, true)
  await fixture.restart()
  expect((await sessionRecord(fixture, old.id)).login).toEqual({
    type: 'personal',
    userId: fixture.owner.id,
  })
  expect((await fixture.send(old.id, 'keep-old')).session.login).toEqual({
    type: 'personal',
    userId: fixture.owner.id,
  })
  expect((await fixture.send(empty.id, 'empty-default')).session.login).toEqual(
    { type: 'org', orgId: fixture.org.id },
  )
})

it('rechecks the default for the new agent of an empty session without fixing its login before a message', async () => {
  const fixture = await createChatFixture(harness)
  await saveChatOrgLogin(harness, fixture, { agent: 'codex' })
  await preferChatOrgLogin(harness, fixture, true, 'codex')
  const empty = await fixture.createSession(CLAUDE)
  const response = await fixture.fetch(
    sessionPaths.model(fixture.org.id, empty.workspaceId, empty.id),
    {
      choice: CODEX,
      draft: { text: '', attachmentIds: [] },
      newSessionId: 'unused',
    },
    fixture.ownerCookie,
    'PUT',
  )
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({
    created: false,
    session: { id: empty.id, choice: CODEX },
  })
  const sent = await fixture.send(empty.id, 'codex', fixture.ownerCookie, CODEX)
  expect(sent.session.login).toEqual({ type: 'org', orgId: fixture.org.id })
})
