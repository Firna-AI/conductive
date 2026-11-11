import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { readWaitlistState } from '../waitlist/data'
import {
  accessRecord,
  sessionState,
  setPaused,
  setWaitlist,
  waitlistFixture,
} from '../waitlist/waitlist.test-support'
import { githubProfile } from './waitlist-sign-in.test-support'

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

it('gives a new sign-in permanent open-sign-up access with its operator and no approval email', async () => {
  const { admin } = await waitlistFixture(harness)
  harness.env.RESEND_API_KEY = 'test-mail-key'
  harness.github.profile = { id: 7, login: 'new-person' }
  harness.github.emails = [
    { email: 'new-person@example.com', primary: true, verified: true },
  ]
  await setWaitlist(harness, false, admin.user.id)
  const session = await harness.login({ appAccess: false })
  const userId = await harness.env.DB.prepare(
    'SELECT id FROM users WHERE github_id = 7',
  ).first<string>('id')
  expect(userId).toBeTypeOf('string')
  expect(await accessRecord(harness, userId ?? '')).toMatchObject({
    source: 'open_signup',
    grantedAt: TEST_TIME,
    operatorUserId: admin.user.id,
  })
  const before = await readWaitlistState(harness.env.DB, userId ?? '')
  expect(before.referralCode).toMatchObject({
    useLimit: 5,
    uses: 0,
    disabled: false,
  })
  expect(
    await harness.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM approval_emails',
    ).first('count'),
  ).toBe(0)
  expect(
    harness.github.requests.filter(
      (request) => new URL(request.url).hostname === 'api.resend.com',
    ),
  ).toHaveLength(0)
  await setWaitlist(harness, true, admin.user.id)
  harness.setTime(TEST_TIME + 1000)
  await harness.login({ appAccess: false })
  expect((await sessionState(harness, session)).appAccess).toBe(true)
  expect(await accessRecord(harness, userId ?? '')).toMatchObject({
    source: 'open_signup',
    grantedAt: TEST_TIME,
    operatorUserId: admin.user.id,
  })
  expect(
    (await readWaitlistState(harness.env.DB, userId ?? '')).referralCode,
  ).toEqual(before.referralCode)
  harness.github.profile = { id: 8, login: 'next-person' }
  const next = await harness.login({ appAccess: false })
  expect((await sessionState(harness, next)).appAccess).toBe(false)
})

it('keeps a new sign-in waiting when open sign-up is paused', async () => {
  const { admin } = await waitlistFixture(harness)
  harness.github.profile = { id: 7, login: 'paused-person' }
  await setWaitlist(harness, false, admin.user.id)
  await setPaused(harness)
  const session = await harness.login({ appAccess: false })
  const state = await sessionState(harness, session)
  expect(state.appAccess).toBe(false)
  expect(await accessRecord(harness, state.user.id)).toBeNull()
})

it('updates the primary verified email and GitHub creation date at each sign-in', async () => {
  const { member } = await waitlistFixture(harness)
  harness.github.profile = {
    id: member.user.githubId,
    login: 'member',
    created_at: '2020-01-01T00:00:00Z',
  }
  harness.github.emailPages = [
    [
      { email: 'not-primary@example.com', verified: true, primary: false },
      { email: 'unverified@example.com', verified: false, primary: true },
    ],
    [{ email: 'PRIMARY@example.com', verified: true, primary: true }],
  ]
  const session = await harness.login({ appAccess: false })
  expect(
    await harness.env.DB.prepare(
      'SELECT primary_verified_email AS email, github_created_at AS createdAt FROM users WHERE id = ?',
    )
      .bind(member.user.id)
      .first(),
  ).toEqual({ email: 'primary@example.com', createdAt: 1577836800000 })
  expect(await readWaitlistState(harness.env.DB, member.user.id)).toEqual({
    appAccess: false,
    signupsPaused: false,
    waitlistOn: true,
    approvalEmail: 'primary@example.com',
    referralCode: null,
  })
  expect((await sessionState(harness, session)).appAccess).toBe(false)
  harness.github.profile = {
    id: member.user.githubId,
    login: 'member',
    created_at: '2021-01-01T00:00:00Z',
  }
  harness.github.emailPages = null
  harness.github.emails = [
    { email: 'unverified@example.com', verified: false, primary: true },
  ]
  await harness.login({ appAccess: false })
  expect(
    await harness.env.DB.prepare(
      'SELECT primary_verified_email AS email, github_created_at AS createdAt FROM users WHERE id = ?',
    )
      .bind(member.user.id)
      .first(),
  ).toEqual({ email: null, createdAt: 1609459200000 })
  expect(
    (await readWaitlistState(harness.env.DB, member.user.id)).approvalEmail,
  ).toBeNull()
})

it.each(['new', 'waiting'] as const)(
  'gives a %s operator app access at sign-in even during the pause',
  async (scenario) => {
    const { member } = await waitlistFixture(harness)
    const githubId = scenario === 'waiting' ? member.user.githubId : 7
    if (scenario === 'waiting') githubProfile(harness, member.user)
    else harness.github.profile = { id: 7, login: 'new-operator' }
    harness.env.OPERATOR_GITHUB_IDS = ` 99, ${githubId} `
    await setPaused(harness)
    const session = await harness.login({ appAccess: false })
    const state = await sessionState(harness, session)
    expect(state.appAccess).toBe(true)
    expect(await accessRecord(harness, state.user.id)).toMatchObject({
      source: 'operator',
      grantedAt: TEST_TIME,
    })
    const before = await readWaitlistState(harness.env.DB, state.user.id)
    expect(before.referralCode).toMatchObject({ useLimit: 5, uses: 0 })
    harness.setTime(TEST_TIME + 1000)
    await harness.login({ appAccess: false })
    expect(await accessRecord(harness, state.user.id)).toMatchObject({
      source: 'operator',
      grantedAt: TEST_TIME,
    })
    expect(await readWaitlistState(harness.env.DB, state.user.id)).toEqual(
      before,
    )
  },
)
