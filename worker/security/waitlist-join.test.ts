import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { API_PATHS } from '../../src/shared/api'
import {
  INVITE_CODE_ERROR_PARAMETER,
  INVITE_CODE_PARAMETER,
  joinPath,
} from '../../src/shared/waitlist'
import { fakeSite } from '../test-support/fake-site'
import {
  createHarness,
  responseCookie,
  TEST_ORIGIN,
  type TestHarness,
} from '../test-support/harness'
import {
  accessRecord,
  addInviteCode,
  sessionState,
  setPaused,
  uses,
  waitlistFixture,
} from '../waitlist/waitlist.test-support'
import { SESSION_COOKIE } from './cookies'
import { hash } from './crypto'
import { DESKTOP_SESSION_COOKIE } from './desktop-contract'
import { desktopRequest, exchangeHandoff } from './desktop-http.test-support'
import { termsContinuation } from './terms-consent.test-support'
import {
  finishJoinSignIn,
  githubProfile,
  joinSignIn,
} from './waitlist-sign-in.test-support'

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

it('gives a new account app access from its signed join code in the same sign-in', async () => {
  const code = await addInviteCode(harness)
  const callback = await joinSignIn(harness, code)
  expect(callback.status).toBe(302)
  const state = await sessionState(
    harness,
    responseCookie(callback, SESSION_COOKIE),
  )
  expect(state.appAccess).toBe(true)
  expect(await accessRecord(harness, state.user.id)).toMatchObject({
    source: 'invite_code',
    code,
  })
  expect(await uses(harness, code)).toBe(1)
})

it.each(['browser', 'desktop'] as const)(
  'carries the signed join code through Terms and %s sign-in and ignores a callback replacement',
  async (mode) => {
    const { member } = await waitlistFixture(harness)
    githubProfile(harness, member.user)
    const code = await addInviteCode(harness)
    const other = await addInviteCode(harness, '23456789AB')
    harness.env.ASSETS = fakeSite()
    const verifier = 'v'.repeat(43)
    const challenge = await hash(verifier)
    const startPath = new URL(API_PATHS.githubSignIn, TEST_ORIGIN)
    startPath.searchParams.set(INVITE_CODE_PARAMETER, 'k7qhm-3xp2r')
    if (mode === 'desktop')
      startPath.searchParams.set('desktop_challenge', challenge)
    const consent = await harness.fetch(startPath.pathname + startPath.search)
    const continuation = await termsContinuation(consent)
    const parameters = new URL(continuation, TEST_ORIGIN).searchParams
    expect(parameters.get(INVITE_CODE_PARAMETER)).toBe('k7qhm-3xp2r')
    expect(parameters.get('desktop_challenge')).toBe(
      mode === 'desktop' ? challenge : null,
    )
    const callback = await finishJoinSignIn(
      harness,
      await harness.fetch(continuation),
      other,
    )
    expect(callback.status).toBe(302)
    const completed =
      mode === 'desktop'
        ? await exchangeHandoff(harness, callback, verifier)
        : callback
    expect(completed.status).toBe(mode === 'desktop' ? 204 : 302)
    const session = responseCookie(
      completed,
      mode === 'desktop' ? DESKTOP_SESSION_COOKIE : SESSION_COOKIE,
    )
    const current =
      mode === 'desktop'
        ? await desktopRequest(harness, API_PATHS.session, session)
        : await harness.request(API_PATHS.session, session)
    expect(await current.json()).toMatchObject({
      appAccess: true,
      user: { id: member.user.id },
    })
    expect(await accessRecord(harness, member.user.id)).toMatchObject({
      source: 'invite_code',
      code,
    })
    expect(await uses(harness, code)).toBe(1)
    expect(await uses(harness, other)).toBe(0)
  },
)

it('ignores a code in the callback when the signed state carries none', async () => {
  const { member } = await waitlistFixture(harness)
  githubProfile(harness, member.user)
  const code = await addInviteCode(harness)
  const callback = await joinSignIn(harness, undefined, code)
  expect(callback.status).toBe(302)
  expect(callback.headers.get('Location')).toBe(TEST_ORIGIN)
  expect(
    (await sessionState(harness, responseCookie(callback, SESSION_COOKIE)))
      .appAccess,
  ).toBe(false)
  expect(await uses(harness)).toBe(0)
})

it('keeps a failed join code and its reason in the redirect while creating a waiting session', async () => {
  const { member } = await waitlistFixture(harness)
  githubProfile(harness, member.user)
  const callback = await joinSignIn(harness, 'zzzzz-zzzzz')
  expect(callback.status).toBe(302)
  const location = new URL(callback.headers.get('Location') ?? '')
  expect(location.pathname).toBe(joinPath('ZZZZZ-ZZZZZ'))
  expect(location.searchParams.get(INVITE_CODE_ERROR_PARAMETER)).toBe(
    'invite_code_not_found',
  )
  expect(
    (await sessionState(harness, responseCookie(callback, SESSION_COOKIE)))
      .appAccess,
  ).toBe(false)
  expect(await uses(harness)).toBe(0)
})

it('keeps the join code unused and opens the app for a person with access during the pause', async () => {
  const { admin } = await waitlistFixture(harness)
  githubProfile(harness, admin.user)
  const code = await addInviteCode(harness)
  await setPaused(harness)
  const callback = await joinSignIn(harness, code)
  expect(callback.status).toBe(302)
  expect(callback.headers.get('Location')).toBe(TEST_ORIGIN)
  expect(await uses(harness)).toBe(0)
  expect(await accessRecord(harness, admin.user.id)).toMatchObject({
    source: 'existing',
  })
})
