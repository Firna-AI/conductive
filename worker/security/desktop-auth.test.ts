import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { API_PATHS } from '../../src/shared/api'
import type { AppDependencies } from '../env'
import { HttpError } from '../http'
import {
  createHarness,
  responseCookie,
  TEST_ORIGIN,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { finishSignIn, startSignIn } from './auth'
import { OAUTH_COOKIE } from './cookies'
import { hash } from './crypto'
import { finishDesktopSignIn } from './desktop-auth'
import {
  DESKTOP_EXCHANGE_PATH,
  DESKTOP_ORIGIN,
  DESKTOP_SESSION_COOKIE,
} from './desktop-contract'
import { gate } from './gate'

let harness: TestHarness
let dependencies: AppDependencies
let now: number
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  now = TEST_TIME
  let sequence = 0
  dependencies = {
    now: () => now,
    randomToken: () => `desktop-${++sequence}`.padEnd(43, 'x'),
    fetch: (request) => harness.github.fetch(request),
  }
})
afterAll(async () => {
  await harness.dispose()
})

async function handoff(verifier: string): Promise<Response> {
  const request = new Request(
    `${TEST_ORIGIN}${API_PATHS.githubSignIn}?desktop_challenge=${await hash(verifier)}`,
  )
  const start = await startSignIn(harness.env, dependencies, request)
  const state = new URL(start.headers.get('Location') ?? '').searchParams.get(
    'state',
  )
  return finishSignIn(
    new Request(
      `${TEST_ORIGIN}${API_PATHS.githubCallback}?state=${state}&code=good-code`,
      {
        headers: { Cookie: responseCookie(start, OAUTH_COOKIE) },
      },
    ),
    harness.env,
    dependencies,
  )
}

function exchange(
  callback: Response,
  verifier: string,
  origin = DESKTOP_ORIGIN,
): Promise<Response> {
  const address = new URL(callback.headers.get('Location') ?? '')
  const token = new URLSearchParams(address.hash.slice(1)).get('token')
  return finishDesktopSignIn(
    new Request(TEST_ORIGIN + DESKTOP_EXCHANGE_PATH, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, verifier }),
    }),
    harness.env,
    dependencies,
  )
}

it('binds desktop sign-in to the initiating app and creates a separate persistent session', async () => {
  const verifier = 'v'.repeat(43)
  const callback = await handoff(verifier)
  expect(callback.status).toBe(302)
  expect(callback.headers.get('Location')).toMatch(
    /^conducting:\/\/auth\/github\/callback#token=/,
  )
  expect(callback.headers.get('Set-Cookie')).not.toContain(
    DESKTOP_SESSION_COOKIE,
  )
  expect(
    await harness.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM sessions',
    ).first('count'),
  ).toBe(0)
  await expect(exchange(callback, 'w'.repeat(43))).rejects.toMatchObject({
    status: 400,
    code: 'invalid_desktop_handoff',
  })
  await expect(
    exchange(callback, verifier, 'https://untrusted.test'),
  ).rejects.toMatchObject({ status: 403 })
  const completed = await exchange(callback, verifier)
  expect(completed.status).toBe(204)
  expect(completed.headers.get('Set-Cookie')).toContain(
    'HttpOnly; Secure; SameSite=None; Max-Age=604800',
  )
  const session = responseCookie(completed, DESKTOP_SESSION_COOKIE)
  const context = await gate(
    new Request(`${TEST_ORIGIN}${API_PATHS.session}`, {
      headers: { Origin: DESKTOP_ORIGIN, Cookie: session },
    }),
    harness.env,
    now,
  )
  expect(context.user.githubLogin).toBe('octocat')
  await expect(exchange(callback, verifier)).rejects.toMatchObject({
    status: 400,
    code: 'invalid_desktop_handoff',
  })
  await expect(
    gate(
      new Request(`${TEST_ORIGIN}${API_PATHS.session}`, {
        headers: { Origin: TEST_ORIGIN, Cookie: session },
      }),
      harness.env,
      now,
    ),
  ).rejects.toMatchObject({ status: 401 })
})

it('expires a desktop handoff without creating a session', async () => {
  const verifier = 'v'.repeat(43)
  const callback = await handoff(verifier)
  now = TEST_TIME + 60_000
  await expect(exchange(callback, verifier)).rejects.toBeInstanceOf(HttpError)
  expect(
    await harness.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM sessions',
    ).first('count'),
  ).toBe(0)
})
