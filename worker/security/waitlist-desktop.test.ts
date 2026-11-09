import { expect, it } from 'vitest'

import { createSignIn, type DesktopCookie } from '../../desktop/src/sign-in'
import { API_PATHS } from '../../src/shared/api'
import { WAITLIST_PATHS } from '../../src/shared/waitlist'
import { fakeSite } from '../test-support/fake-site'
import { createHarness, TEST_TIME } from '../test-support/harness'
import { addInviteCode, uses } from '../waitlist/waitlist.test-support'
import { DESKTOP_EXCHANGE_PATH } from './desktop-contract'
import { desktopRequest } from './desktop-http.test-support'
import { termsContinuation } from './terms-consent.test-support'
import { finishJoinSignIn } from './waitlist-sign-in.test-support'

it('returns a failed Mac join to its code and repeats its refusal without taking a use', async () => {
  const harness = await createHarness()
  try {
    harness.env.ASSETS = fakeSite()
    const code = await addInviteCode(harness)
    await harness.env.DB.prepare(
      'UPDATE access_codes SET disabled_at = ? WHERE code = ?',
    )
      .bind(TEST_TIME, code)
      .run()
    const opened: string[] = []
    const loaded: string[] = []
    const saved: DesktopCookie[] = []
    const signIn = createSignIn({
      appOrigin: harness.env.APP_ORIGIN,
      random: () => 'v'.repeat(43),
      now: () => TEST_TIME,
      openExternal: async (address) => {
        opened.push(address)
      },
      exchange: async (request) =>
        harness.fetch(DESKTOP_EXCHANGE_PATH, {
          method: request.method,
          headers: request.headers,
          body: await request.text(),
        }),
      saveCookie: async (cookie) => {
        saved.push(cookie)
      },
      flushCookies: async () => {},
      signedIn: async (path) => {
        loaded.push(path)
      },
    })
    await signIn.start('K7QHM-3XP2R')
    const browser = new URL(opened[0])
    const consent = await harness.fetch(browser.pathname + browser.search)
    const callback = await finishJoinSignIn(
      harness,
      await harness.fetch(await termsContinuation(consent)),
    )
    expect(callback.status).toBe(302)
    const handoff = callback.headers.get('Location') ?? ''
    expect(new URL(handoff).search).toBe('')
    expect(new URLSearchParams(new URL(handoff).hash.slice(1)).size).toBe(1)
    expect(await signIn.receive(handoff)).toBe(true)
    expect(loaded).toEqual(['/join/K7QHM-3XP2R'])
    expect(saved).toHaveLength(1)
    const session = `${saved[0].name}=${saved[0].value}`
    const state = await desktopRequest(harness, API_PATHS.session, session)
    expect(state.status).toBe(200)
    expect(await state.json()).toMatchObject({ appAccess: false })
    for (const attempt of [1, 2]) {
      const response = await desktopRequest(
        harness,
        WAITLIST_PATHS.useCode,
        session,
        {
          method: 'POST',
          body: JSON.stringify({ code: 'K7QHM-3XP2R' }),
        },
      )
      expect(response.status, `Use ${attempt}`).toBe(409)
      expect(await response.json()).toMatchObject({
        error: { code: 'invite_code_disabled' },
      })
      expect(await uses(harness, code)).toBe(0)
    }
  } finally {
    await harness.dispose()
  }
})
