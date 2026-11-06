import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { API_PATHS } from '../../src/shared/api'
import { HEALTH_PATH } from '../../src/shared/health'
import { createApp } from '../application'
import {
  createHarness,
  responseCookie,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { SESSION_COOKIE } from './cookies'
import {
  DESKTOP_EXCHANGE_PATH,
  DESKTOP_ORIGIN,
  DESKTOP_SESSION_COOKIE,
} from './desktop-contract'
import {
  desktopHandoff,
  desktopRequest,
  exchangeHandoff,
} from './desktop-http.test-support'

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

it('completes a verifier-bound GitHub desktop session and signs out without changing the browser session', async () => {
  const verifier = 'v'.repeat(43)
  const callback = await desktopHandoff(harness, verifier)
  expect(callback.status).toBe(302)
  expect(callback.headers.get('Location')).toMatch(
    /^conducting:\/\/auth\/github\/callback#token=/,
  )
  expect(callback.headers.get('Set-Cookie')).not.toContain(
    DESKTOP_SESSION_COOKIE,
  )
  expect(callback.headers.get('Set-Cookie')).not.toContain(`${SESSION_COOKIE}=`)
  expect(harness.github.requests).toHaveLength(2)
  expect(
    await harness.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM sessions',
    ).first('count'),
  ).toBe(0)
  const wrong = await exchangeHandoff(harness, callback, 'w'.repeat(43))
  expect(wrong.status).toBe(400)
  expect(await wrong.json()).toMatchObject({
    error: { code: 'invalid_desktop_handoff' },
  })
  const foreign = await exchangeHandoff(
    harness,
    callback,
    verifier,
    'https://untrusted.test',
  )
  expect(foreign.status).toBe(403)
  expect(foreign.headers.get('Access-Control-Allow-Origin')).toBeNull()
  const completed = await exchangeHandoff(harness, callback, verifier)
  expect(completed.status).toBe(204)
  expect(completed.headers.get('Set-Cookie')).toContain(
    'HttpOnly; Secure; SameSite=None; Max-Age=604800',
  )
  expect(completed.headers.get('Access-Control-Allow-Origin')).toBe(
    DESKTOP_ORIGIN,
  )
  const session = responseCookie(completed, DESKTOP_SESSION_COOKIE)
  const current = await desktopRequest(harness, API_PATHS.session, session)
  expect(current.status).toBe(200)
  expect(current.headers.get('Access-Control-Allow-Credentials')).toBe('true')
  expect(await current.json()).toMatchObject({
    user: { githubLogin: 'octocat' },
  })
  const replay = await exchangeHandoff(harness, callback, verifier)
  expect(replay.status).toBe(400)
  expect(await replay.json()).toMatchObject({
    error: { code: 'invalid_desktop_handoff' },
  })
  expect((await harness.request(API_PATHS.session, session)).status).toBe(401)
  const browserSession = await harness.login()
  expect(
    (await desktopRequest(harness, API_PATHS.session, browserSession)).status,
  ).toBe(401)
  const missing = await desktopRequest(harness, '/api/unknown', session)
  expect(missing.status).toBe(404)
  expect(missing.headers.get('Access-Control-Allow-Origin')).toBe(
    DESKTOP_ORIGIN,
  )
  const signOut = await desktopRequest(harness, API_PATHS.signOut, session, {
    method: 'POST',
    body: '{}',
  })
  expect(signOut.status).toBe(204)
  expect(signOut.headers.get('Set-Cookie')).toContain(
    `${DESKTOP_SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0`,
  )
  expect(
    (await desktopRequest(harness, API_PATHS.session, session)).status,
  ).toBe(401)
  expect(
    (await harness.request(API_PATHS.session, browserSession)).status,
  ).toBe(200)
})

it('expires a desktop handoff before the public exchange can create a session', async () => {
  const verifier = 'v'.repeat(43)
  const callback = await desktopHandoff(harness, verifier)
  harness.setTime(TEST_TIME + 60_000)
  const response = await exchangeHandoff(harness, callback, verifier)
  expect(response.status).toBe(400)
  expect(await response.json()).toMatchObject({
    error: { code: 'invalid_desktop_handoff' },
  })
  expect(
    await harness.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM sessions',
    ).first('count'),
  ).toBe(0)
})

it('serves desktop preflights and API errors without admitting foreign origins or other hosts', async () => {
  const headers = {
    Origin: DESKTOP_ORIGIN,
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'Content-Type',
  }
  const preflight = await harness.fetch(DESKTOP_EXCHANGE_PATH, {
    method: 'OPTIONS',
    headers,
  })
  expect(preflight.status).toBe(204)
  expect(preflight.headers.get('Access-Control-Allow-Origin')).toBe(
    DESKTOP_ORIGIN,
  )
  expect(preflight.headers.get('Access-Control-Allow-Credentials')).toBe('true')
  expect(preflight.headers.get('Access-Control-Allow-Methods')).toBe('POST')
  expect(preflight.headers.get('Access-Control-Allow-Headers')).toBe(
    'Content-Type',
  )
  expect(preflight.headers.get('Vary')).toBe('Origin')
  expect(preflight.headers.get('Set-Cookie')).toBeNull()
  const refused = await harness.fetch(DESKTOP_EXCHANGE_PATH, {
    method: 'OPTIONS',
    headers: { ...headers, 'Access-Control-Request-Headers': 'Authorization' },
  })
  expect(refused.status).toBe(403)
  expect(await refused.json()).toEqual({
    error: { code: 'origin_forbidden', message: 'Open the app to continue.' },
  })
  expect(refused.headers.get('Access-Control-Allow-Origin')).toBe(
    DESKTOP_ORIGIN,
  )
  expect(refused.headers.get('Access-Control-Allow-Methods')).toBeNull()
  const unsigned = await desktopRequest(harness, API_PATHS.session)
  expect(unsigned.status).toBe(401)
  expect(unsigned.headers.get('Access-Control-Allow-Origin')).toBe(
    DESKTOP_ORIGIN,
  )
  expect(unsigned.headers.get('Cache-Control')).toBe('no-store')
  const health = await desktopRequest(harness, HEALTH_PATH)
  expect(health.status).toBe(200)
  expect(health.headers.get('Access-Control-Allow-Origin')).toBe(DESKTOP_ORIGIN)
  const upgrade = await desktopRequest(harness, API_PATHS.session, '', {
    headers: { Upgrade: 'websocket' },
  })
  expect(upgrade.status).toBe(401)
  const upgradedPreflight = await harness.fetch(DESKTOP_EXCHANGE_PATH, {
    method: 'OPTIONS',
    headers: { ...headers, Upgrade: 'websocket' },
  })
  expect(upgradedPreflight.status).toBe(401)
  for (const origin of ['conducting-app://other', 'null']) {
    const response = await harness.fetch(API_PATHS.session, {
      headers: { Origin: origin },
    })
    expect(response.status, origin).toBe(403)
    expect(
      response.headers.get('Access-Control-Allow-Origin'),
      origin,
    ).toBeNull()
  }
  const app = createApp()
  const env = {
    ...harness.env,
    MACHINE_ORIGIN: 'https://machines.conducting.test',
    PREVIEW_DOMAIN: 'conducting-previews.test',
  }
  for (const input of [
    { host: 'https://machines.conducting.test', status: 501 },
    { host: 'https://unknown.conducting-previews.test', status: 404 },
    { host: 'https://untrusted.test', status: 403 },
  ]) {
    const response = await app.fetch(
      new Request(input.host + DESKTOP_EXCHANGE_PATH, {
        method: 'OPTIONS',
        headers,
      }),
      env,
    )
    expect(response.status, input.host).toBe(input.status)
    expect(
      response.headers.get('Access-Control-Allow-Origin'),
      input.host,
    ).toBeNull()
    expect(
      response.headers.get('Access-Control-Allow-Credentials'),
      input.host,
    ).toBeNull()
    expect(
      response.headers.get('Access-Control-Allow-Methods'),
      input.host,
    ).toBeNull()
  }
})
