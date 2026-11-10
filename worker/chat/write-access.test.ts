import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { API_PATHS } from '../../src/shared/api'
import { sessionPath } from '../../src/shared/sessions'
import { heldOperation } from '../test-support/held-operation'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import {
  createChatFixture,
  WORKSPACE_ID,
  type ChatFixture,
} from './harness.test-support'
const refusals = {
  signIn: {
    status: 401,
    error: {
      code: 'sign_in_required',
      message: 'Sign in with GitHub to continue.',
    },
  },
  org: {
    status: 404,
    error: { code: 'org_not_found', message: 'The org is not available.' },
  },
  workspace: {
    status: 404,
    error: {
      code: 'workspace_not_found',
      message: 'The workspace is not available.',
    },
  },
  archived: {
    status: 409,
    error: {
      code: 'workspace_archived',
      message: 'The archived chat is read-only.',
    },
  },
}
interface AccessChange {
  name: string
  refusal: keyof typeof refusals
  prepare?(fixture: ChatFixture): Promise<unknown>
  change(fixture: ChatFixture): Promise<unknown>
}
const queuedChanges: AccessChange[] = [
  {
    name: 'the stored session expires',
    refusal: 'signIn',
    change: (fixture) =>
      fixture.env.DB.prepare(
        'UPDATE sessions SET expires_at = ? WHERE user_id = ?',
      )
        .bind(TEST_TIME, fixture.member.id)
        .run(),
  },
  {
    name: 'the signed cookie expires while its stored session stays valid',
    refusal: 'signIn',
    prepare: (fixture) =>
      fixture.env.DB.prepare(
        'UPDATE sessions SET expires_at = ? WHERE user_id = ?',
      )
        .bind(TEST_TIME + 9 * 24 * 60 * 60 * 1000, fixture.member.id)
        .run(),
    change: (fixture) => fixture.clock.advance(8 * 24 * 60 * 60 * 1000),
  },
  {
    name: 'the user is suspended while the session remains stored',
    refusal: 'signIn',
    change: (fixture) =>
      fixture.env.DB.prepare('UPDATE users SET suspended_at = ? WHERE id = ?')
        .bind(TEST_TIME, fixture.member.id)
        .run(),
  },
  {
    name: 'the member is removed from the org',
    refusal: 'org',
    change: (fixture) =>
      fixture.env.DB.prepare(
        'DELETE FROM org_members WHERE org_id = ? AND user_id = ?',
      )
        .bind(fixture.org.id, fixture.member.id)
        .run(),
  },
  {
    name: 'the org is deleted',
    refusal: 'org',
    change: (fixture) =>
      fixture.env.DB.prepare('UPDATE orgs SET deleted_at = ? WHERE id = ?')
        .bind(TEST_TIME, fixture.org.id)
        .run(),
  },
  {
    name: 'the workspace is deleted',
    refusal: 'workspace',
    change: (fixture) =>
      fixture.env.DB.prepare('DELETE FROM workspaces WHERE id = ?')
        .bind(WORKSPACE_ID)
        .run(),
  },
  {
    name: 'the workspace is archived',
    refusal: 'archived',
    change: (fixture) =>
      fixture.env.DB.prepare(
        'UPDATE workspaces SET archived_at = ? WHERE id = ?',
      )
        .bind(TEST_TIME, WORKSPACE_ID)
        .run(),
  },
]
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
it('refuses a rename held at the body reader after sign-out and leaves new refused bodies unread', async () => {
  const fixture = await createChatFixture(harness)
  const session = await fixture.createSession()
  const value = { title: 'After sign-out' }
  const path = sessionPath(fixture.org.id, WORKSPACE_ID, session.id)
  const base = fixture.request(path, value, fixture.memberCookie, 'PATCH')
  const before = structuredClone((await fixture.snapshot()).records)
  const writes = (await fixture.snapshot()).writes.length
  const held = await fixture.heldRequest(base, value)
  const changing = held.fetch()
  try {
    await held.reading
    const signedOut = await harness.request(
      API_PATHS.signOut,
      fixture.memberCookie,
      { method: 'POST', body: '{}' },
    )
    expect(signedOut.status).toBe(204)
  } finally {
    held.release()
    await changing
  }
  const response = await changing
  expect(response.status).toBe(401)
  expect(await response.json()).toEqual({ error: refusals.signIn.error })
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  expect((await fixture.snapshot()).records).toEqual(before)
  expect((await fixture.snapshot()).writes).toHaveLength(writes)
  const early = await fixture.heldRequest(
    fixture.request(path, value, fixture.memberCookie, 'PATCH'),
    value,
  )
  try {
    expect((await early.fetch()).status).toBe(401)
    expect(await early.bodyUsed()).toBe(false)
  } finally {
    early.release()
  }
})
it.each(queuedChanges)(
  'refuses a queued rename after $name',
  async (change) => {
    const fixture = await createChatFixture(harness)
    const session = await fixture.createSession()
    await change.prepare?.(fixture)
    const before = structuredClone((await fixture.snapshot()).records)
    const writes = (await fixture.snapshot()).writes.length
    const held = heldOperation()
    const holding = fixture.chat.store.run(held.wait)
    await held.entered
    const observer = await fixture.observeNextQueued()
    const changing = fixture.fetch(
      sessionPath(fixture.org.id, WORKSPACE_ID, session.id),
      { title: 'After access ended' },
      fixture.memberCookie,
      'PATCH',
    )
    try {
      await observer.queued
      await change.change(fixture)
    } finally {
      held.release()
      await holding
      await changing
      await observer.restore()
    }
    const response = await changing
    const refusal = refusals[change.refusal]
    expect(response.status).toBe(refusal.status)
    expect(await response.json()).toEqual({ error: refusal.error })
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect((await fixture.snapshot()).records).toEqual(before)
    expect((await fixture.snapshot()).writes).toHaveLength(writes)
  },
)
