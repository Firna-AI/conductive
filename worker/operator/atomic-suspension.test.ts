import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { API_PATHS } from '../../src/shared/api'
import { authenticateWorkspaceToken } from '../lifecycle/tokens'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import {
  atomicSuspensionFixture,
  dropRevocationFailure,
  failPreviewRevocation,
  readRevocations,
} from './atomic-suspension.test-support'
import { suspensionEvents, suspensionRequest } from './lift.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await dropRevocationFailure(harness.env.DB)
  await harness.env.DB.prepare('DELETE FROM suspension_events').run()
  await harness.reset()
  harness.env.OPERATOR_GITHUB_IDS = '7'
})
afterAll(async () => harness.dispose())

it.each(['user', 'org'] as const)(
  'rolls back a failed %s revocation with its suspension and event, then keeps earlier access revoked after a completed suspend and lift',
  async (kind) => {
    const fixture = await atomicSuspensionFixture(harness, kind)
    const { operator, target, token, path } = fixture
    expect(
      (await harness.request(API_PATHS.session, target.session)).status,
    ).toBe(200)
    await expect(
      authenticateWorkspaceToken(harness.env, token),
    ).resolves.toEqual({ workspaceId: 'owned-workspace', orgId: 'resources' })
    await failPreviewRevocation(harness.env.DB)
    const failed = await suspensionRequest(
      harness,
      operator.session,
      path,
      'POST',
    )
    expect(failed.status).toBe(500)
    expect(await failed.json()).toEqual({
      error: {
        code: 'internal_error',
        message: 'The request failed. Try again.',
      },
    })
    expect(await fixture.readSuspension()).toBeNull()
    expect(await suspensionEvents(harness.env.DB)).toEqual([])
    expect(await readRevocations(harness.env.DB)).toEqual({
      token: null,
      preview: null,
    })
    expect(
      (await harness.request(API_PATHS.session, target.session)).status,
    ).toBe(200)
    await expect(
      authenticateWorkspaceToken(harness.env, token),
    ).resolves.toEqual({ workspaceId: 'owned-workspace', orgId: 'resources' })
    const unchanged = await suspensionRequest(
      harness,
      operator.session,
      path,
      'DELETE',
    )
    expect(unchanged.status).toBe(200)
    expect(await unchanged.json()).toMatchObject({
      liftedAt: null,
      pendingWorkspaceIds: [],
    })
    expect(await suspensionEvents(harness.env.DB)).toEqual([])
    await dropRevocationFailure(harness.env.DB)
    const suspended = await suspensionRequest(
      harness,
      operator.session,
      path,
      'POST',
    )
    expect(suspended.status).toBe(202)
    expect(await fixture.readSuspension()).toEqual({
      suspendedAt: TEST_TIME,
      operator: { githubId: 7, login: 'operator' },
    })
    expect(await readRevocations(harness.env.DB)).toEqual({
      token: TEST_TIME,
      preview: TEST_TIME,
    })
    harness.setTime(TEST_TIME + 1_000)
    const lifted = await suspensionRequest(
      harness,
      operator.session,
      path,
      'DELETE',
    )
    expect(lifted.status).toBe(200)
    expect(await lifted.json()).toMatchObject({
      liftedAt: TEST_TIME + 1_000,
      pendingWorkspaceIds: ['owned-workspace'],
    })
    expect(await fixture.readSuspension()).toBeNull()
    expect(
      (await harness.request(API_PATHS.session, target.session)).status,
    ).toBe(kind === 'user' ? 401 : 200)
    await expect(
      authenticateWorkspaceToken(harness.env, token),
    ).rejects.toMatchObject({ code: 'workspace_token_refused' })
    expect(await readRevocations(harness.env.DB)).toEqual({
      token: TEST_TIME,
      preview: TEST_TIME,
    })
    expect(
      (await suspensionEvents(harness.env.DB)).map((event) => event.action),
    ).toEqual(['suspend', 'lift'])
  },
)

it.each(['user', 'org'] as const)(
  'repeats every %s revocation after an earlier partial suspension without changing its first record',
  async (kind) => {
    const fixture = await atomicSuspensionFixture(harness, kind)
    const { operator, target, token, path } = fixture
    await fixture.seedEarlierPartialSuspension()
    const original = {
      suspendedAt: TEST_TIME - 1_000,
      operator: { githubId: 7, login: 'operator' },
    }
    const events = await suspensionEvents(harness.env.DB)
    expect(await readRevocations(harness.env.DB)).toEqual({
      token: null,
      preview: null,
    })
    await failPreviewRevocation(harness.env.DB)
    expect(
      (await suspensionRequest(harness, operator.session, path, 'POST')).status,
    ).toBe(500)
    expect(await fixture.readSuspension()).toEqual(original)
    expect(await suspensionEvents(harness.env.DB)).toEqual(events)
    expect(await readRevocations(harness.env.DB)).toEqual({
      token: null,
      preview: null,
    })
    await dropRevocationFailure(harness.env.DB)
    harness.setTime(TEST_TIME + 1_000)
    expect(
      (await suspensionRequest(harness, operator.session, path, 'POST')).status,
    ).toBe(202)
    expect(await fixture.readSuspension()).toEqual(original)
    expect(await suspensionEvents(harness.env.DB)).toEqual(events)
    expect(await readRevocations(harness.env.DB)).toEqual({
      token: TEST_TIME + 1_000,
      preview: TEST_TIME + 1_000,
    })
    harness.setTime(TEST_TIME + 2_000)
    const lifted = await suspensionRequest(
      harness,
      operator.session,
      path,
      'DELETE',
    )
    expect(lifted.status).toBe(200)
    expect(await lifted.json()).toMatchObject({
      liftedAt: TEST_TIME + 2_000,
      pendingWorkspaceIds: ['owned-workspace'],
    })
    expect(
      (await harness.request(API_PATHS.session, target.session)).status,
    ).toBe(kind === 'user' ? 401 : 200)
    await expect(
      authenticateWorkspaceToken(harness.env, token),
    ).rejects.toMatchObject({ code: 'workspace_token_refused' })
    expect(await readRevocations(harness.env.DB)).toEqual({
      token: TEST_TIME + 1_000,
      preview: TEST_TIME + 1_000,
    })
    expect(
      (await suspensionEvents(harness.env.DB)).map((event) => event.action),
    ).toEqual(['suspend', 'lift'])
  },
)
