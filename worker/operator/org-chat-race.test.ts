import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { API_PATHS } from '../../src/shared/api'
import { orgSuspensionPath } from '../../src/shared/operator'
import {
  sessionPath,
  sessionPaths,
  sessionsPath,
} from '../../src/shared/sessions'
import { createChatFixture, WORKSPACE_ID } from '../chat/harness.test-support'
import { heldOperation } from '../test-support/held-operation'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { recordOrgSuspension } from './org-data'
const refusal = {
  error: {
    code: 'org_suspended',
    message:
      'This org is suspended. For questions, write to abuse@conductive.build.',
  },
}
let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  delete harness.env.OPERATOR_GITHUB_IDS
})
afterAll(async () => {
  await harness.dispose()
})
it('refuses a chat rename whose body finishes after the operator suspension reply', async () => {
  const fixture = await createChatFixture(harness)
  const session = await fixture.createSession()
  const path = sessionPath(fixture.org.id, WORKSPACE_ID, session.id)
  expect(
    (
      await fixture.fetch(
        path,
        { title: 'Before suspension' },
        fixture.ownerCookie,
        'PATCH',
      )
    ).status,
  ).toBe(200)
  const beforeSessions = await (
    await fixture.fetch(sessionsPath(fixture.org.id, WORKSPACE_ID))
  ).json()
  const beforeHistory = await fixture.history(session.id)
  const value = { title: 'After suspension' }
  const held = await fixture.heldRequest(
    fixture.request(path, value, fixture.ownerCookie, 'PATCH'),
    value,
  )
  const changing = held.fetch()
  try {
    await held.reading
    harness.env.OPERATOR_GITHUB_IDS = '7'
    const suspended = await harness.request(
      orgSuspensionPath(fixture.org.id),
      fixture.ownerCookie,
      { method: 'POST', body: '{}' },
    )
    expect(suspended.status).toBe(202)
    expect(await suspended.json()).toEqual({
      orgId: fixture.org.id,
      suspendedAt: TEST_TIME,
      pendingWorkspaceIds: [WORKSPACE_ID],
      pendingBuildIds: [],
    })
  } finally {
    held.release()
    await changing
  }
  const response = await changing
  expect(response.status).toBe(403)
  expect(await response.json()).toEqual(refusal)
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  expect(
    await (
      await fixture.fetch(sessionsPath(fixture.org.id, WORKSPACE_ID))
    ).json(),
  ).toEqual(beforeSessions)
  expect(await fixture.history(session.id)).toEqual(beforeHistory)
  expect(
    (await harness.request(API_PATHS.session, fixture.ownerCookie)).status,
  ).toBe(200)
})
it('refuses a chat reopen that passed authorization before waiting in the real chat queue', async () => {
  const fixture = await createChatFixture(harness)
  const session = await fixture.createSession()
  const close = await fixture.fetch(
    sessionPaths.close(fixture.org.id, WORKSPACE_ID, session.id),
    { stopRunningTurn: false },
  )
  expect(close.status).toBe(200)
  const beforeSessions = await (
    await fixture.fetch(sessionsPath(fixture.org.id, WORKSPACE_ID))
  ).json()
  const beforeHistory = await fixture.history(session.id)
  const held = heldOperation()
  const holding = fixture.chat.store.run(held.wait)
  await held.entered
  const observer = await fixture.observeNextQueued()
  const changing = fixture.fetch(
    sessionPaths.reopen(fixture.org.id, WORKSPACE_ID, session.id),
    {},
  )
  try {
    await observer.queued
    await recordOrgSuspension(
      harness.env.DB,
      fixture.org.id,
      fixture.owner.id,
      TEST_TIME,
    )
  } finally {
    held.release()
    await holding
    await changing
    await observer.restore()
  }
  const response = await changing
  expect(response.status).toBe(403)
  expect(await response.json()).toEqual(refusal)
  expect(
    await (
      await fixture.fetch(sessionsPath(fixture.org.id, WORKSPACE_ID))
    ).json(),
  ).toEqual(beforeSessions)
  expect(await fixture.history(session.id)).toEqual(beforeHistory)
})
