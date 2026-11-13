import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  sessionPath,
  sessionPaths,
  sessionsPath,
  type ChangeModelResponse,
  type SessionsResponse,
} from '../../src/shared/sessions'
import { createHarness, type TestHarness } from '../test-support/harness'
import {
  CLAUDE,
  CODEX,
  createChatFixture,
  WORKSPACE_ID,
} from './harness.test-support'
describe('client-selected model session IDs', () => {
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
  it('retries one model-created session without overwriting later work and rejects occupied IDs', async () => {
    const fixture = await createChatFixture(harness)
    const source = await fixture.createSession()
    const occupied = await fixture.createSession(CODEX)
    // A session with no message keeps another agent, so the source has one.
    await fixture.send(source.id, 'source-message')
    const path = sessionPaths.model(fixture.org.id, WORKSPACE_ID, source.id)
    const draft = {
      text: 'Move this unchanged draft',
      attachmentIds: ['attachment'],
    }
    const request = { newSessionId: '__proto__', choice: CODEX, draft }
    const response = await fixture.fetch(
      path,
      request,
      fixture.memberCookie,
      'PUT',
    )
    expect(response.status).toBe(200)
    const created: ChangeModelResponse = await response.json()
    expect(created).toMatchObject({
      created: true,
      session: {
        id: '__proto__',
        choice: CODEX,
        startedBy: { id: fixture.member.id },
        sourceSessionId: null,
      },
      draft,
    })
    const same = await fixture.fetch(
      path,
      { newSessionId: null, choice: CLAUDE, draft },
      fixture.ownerCookie,
      'PUT',
    )
    expect(same.status).toBe(200)
    expect(await same.json()).toMatchObject({
      created: false,
      session: { id: source.id, startedBy: { id: fixture.owner.id } },
      draft,
    })
    await fixture.fetch(
      sessionPath(fixture.org.id, WORKSPACE_ID, '__proto__'),
      { title: 'Later session title' },
      fixture.ownerCookie,
      'PATCH',
    )
    await fixture.send(
      '__proto__',
      'later-message',
      fixture.memberCookie,
      CODEX,
    )
    const laterChoice = { ...CODEX, model: 'later-codex-model' }
    await fixture.fetch(
      sessionPaths.model(fixture.org.id, WORKSPACE_ID, '__proto__'),
      { newSessionId: occupied.id, choice: laterChoice, draft },
      fixture.ownerCookie,
      'PUT',
    )
    const history = await fixture.history('__proto__')
    const session = await fixture.chat.store.read(WORKSPACE_ID, (view) =>
      view.session('__proto__'),
    )
    await fixture.restart()
    const retry = await fixture.fetch(
      path,
      request,
      fixture.memberCookie,
      'PUT',
    )
    expect(retry.status).toBe(200)
    expect(await retry.json()).toEqual({
      eventNumber: 10,
      created: true,
      session,
      draft,
    })
    expect(await fixture.history('__proto__')).toEqual(history)
    const duplicateSource = await fixture.fetch(
      path,
      { ...request, newSessionId: occupied.id },
      fixture.ownerCookie,
      'PUT',
    )
    expect(duplicateSource.status).toBe(409)
    expect(await duplicateSource.json()).toMatchObject({
      error: { code: 'session_id_conflict' },
    })
    expect(await fixture.history('__proto__')).toEqual(history)
    const invalid = await fixture.fetch(
      path,
      { ...request, newSessionId: '' },
      fixture.ownerCookie,
      'PUT',
    )
    expect(invalid.status).toBe(400)
    const list: SessionsResponse = await (
      await fixture.fetch(sessionsPath(fixture.org.id, WORKSPACE_ID))
    ).json()
    expect(list.sessions.map(({ id }) => id).sort()).toEqual(
      ['__proto__', occupied.id, source.id].sort(),
    )
    expect(
      history.events.filter(({ event }) => event.type === 'message.accepted'),
    ).toHaveLength(1)
  })
})
