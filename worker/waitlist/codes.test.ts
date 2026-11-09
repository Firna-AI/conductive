import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import type { WaitlistStateResponse } from '../../src/shared/waitlist'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { readWaitlistState } from './data'
import {
  accessRecord,
  addInviteCode,
  setPaused,
  useCode,
  uses,
  waitlistFixture,
} from './waitlist.test-support'

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

it.each(['invite', 'referral'] as const)(
  'uses a typed %s code and records its source with a personal referral code',
  async (kind) => {
    const { admin, member } = await waitlistFixture(harness)
    const owner = await readWaitlistState(harness.env.DB, admin.user.id)
    const code =
      kind === 'invite'
        ? await addInviteCode(harness)
        : owner.referralCode!.code.replace('-', '')
    const typed =
      kind === 'invite'
        ? `${code.slice(0, 5)}-${code.slice(5)}`.toLowerCase()
        : code.toLowerCase()
    const response = await useCode(harness, member.session, typed)
    expect(response.status).toBe(200)
    const value: WaitlistStateResponse = await response.json()
    expect(value).toMatchObject({
      appAccess: true,
      referralCode: { useLimit: 5, uses: 0, disabled: false },
    })
    expect(await accessRecord(harness, member.user.id)).toMatchObject({
      source: `${kind}_code`,
      code,
      grantedAt: TEST_TIME,
    })
    expect(
      await harness.env.DB.prepare(
        'SELECT code, user_id AS userId, used_at AS usedAt FROM access_code_uses',
      )
        .all()
        .then((result) => result.results),
    ).toEqual([{ code, userId: member.user.id, usedAt: TEST_TIME }])
    const state = await readWaitlistState(harness.env.DB, admin.user.id)
    expect(state).toEqual({
      ...owner,
      referralCode: {
        ...owner.referralCode,
        uses: kind === 'referral' ? 1 : 0,
      },
    })
  },
)

it.each([
  { reason: 'unknown', status: 404, error: 'invite_code_not_found' },
  { reason: 'disabled', status: 409, error: 'invite_code_disabled' },
  { reason: 'used up', status: 409, error: 'invite_code_used_up' },
  { reason: 'pause', status: 403, error: 'signups_paused' },
])(
  'refuses $reason before lower priority reasons without taking a use',
  async ({ reason, status, error }) => {
    const { member, admin } = await waitlistFixture(harness)
    const code = await addInviteCode(
      harness,
      'K7QHM3XP2R',
      reason === 'disabled' ? 0 : 1,
    )
    if (reason === 'disabled')
      await harness.env.DB.prepare(
        'UPDATE access_codes SET disabled_at = ? WHERE code = ?',
      )
        .bind(TEST_TIME, code)
        .run()
    if (reason === 'used up')
      await harness.env.DB.prepare(
        'INSERT INTO access_code_uses (code, user_id, used_at) VALUES (?, ?, ?)',
      )
        .bind(code, admin.user.id, TEST_TIME)
        .run()
    await setPaused(harness)
    const before = await uses(harness)
    const response = await useCode(
      harness,
      member.session,
      reason === 'unknown' ? 'WRONG' : code,
    )
    expect(response.status).toBe(status)
    expect(await response.json()).toMatchObject({ error: { code: error } })
    expect(await uses(harness)).toBe(before)
    expect(await accessRecord(harness, member.user.id)).toBeNull()
  },
)

it('keeps an accessible user and a disabled referral code unchanged during the pause', async () => {
  const { admin } = await waitlistFixture(harness)
  await harness.env.DB.prepare('UPDATE access_codes SET disabled_at = ?')
    .bind(TEST_TIME)
    .run()
  await setPaused(harness)
  const before = await readWaitlistState(harness.env.DB, admin.user.id)
  const response = await useCode(harness, admin.session, 'unknown')
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual(before)
  expect(await uses(harness)).toBe(0)
})

it('uses the same code after the pause ends without losing its use', async () => {
  const { member } = await waitlistFixture(harness)
  const code = await addInviteCode(harness)
  await setPaused(harness)
  expect((await useCode(harness, member.session, code)).status).toBe(403)
  expect(await uses(harness)).toBe(0)
  await setPaused(harness, false)
  expect((await useCode(harness, member.session, code)).status).toBe(200)
  expect(await uses(harness)).toBe(1)
})
