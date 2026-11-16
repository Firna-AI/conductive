import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { API_PATHS } from '../../src/shared/api'
import { previewPath } from '../../src/shared/previews'
import { acceptedTermsSignInPath } from '../../src/shared/terms'
import {
  createHarness,
  responseCookie,
  TEST_ORIGIN,
  type TestHarness,
} from '../test-support/harness'
import { fakeSite } from '../test-support/fake-site'
import { OAUTH_COOKIE } from './cookies'
import { SIGN_IN_RETURN_PARAMETER, signInReturnPath } from './preview-sign-in'
import { termsContinuation } from './terms-consent.test-support'

const launch = previewPath('org-1', 'workspace-1', 'preview-1')
const page = { 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Dest': 'document' }

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
afterAll(async () => {
  await harness.dispose()
})
beforeEach(async () => {
  await harness.reset()
})

function withReturn(path: string, returnTo: string): string {
  const url = new URL(path, TEST_ORIGIN)
  url.searchParams.set(SIGN_IN_RETURN_PARAMETER, returnTo)
  return url.pathname + url.search
}

async function finish(start: Response): Promise<Response> {
  const location = new URL(start.headers.get('Location') ?? '')
  return harness.fetch(
    `${API_PATHS.githubCallback}?state=${location.searchParams.get('state')}&code=good-code`,
    { headers: { Cookie: responseCookie(start, OAUTH_COOKIE) } },
  )
}

it('accepts only the exact path of a preview launch as a return address', () => {
  expect(signInReturnPath(launch)).toBe(launch)
  for (const value of [
    null,
    '',
    '/',
    '/orgs/org-1/workspaces/workspace-1/preview/preview-1',
    `${launch}/close`,
    `${launch}?next=1`,
    `${TEST_ORIGIN}${launch}`,
    '//evil.example/api/orgs/a/workspaces/b/previews/c',
    '/api/orgs/a/workspaces/b/previews/..',
    '/api/orgs/a/workspaces/b/previews/c d',
  ])
    expect(signInReturnPath(value)).toBeNull()
})

it('sends a signed-out browser tab of a preview launch to sign-in', async () => {
  const response = await harness.fetch(launch, { headers: page })
  expect(response.status).toBe(302)
  const location = new URL(response.headers.get('Location') ?? '')
  expect(location.origin + location.pathname).toBe(
    `${TEST_ORIGIN}${API_PATHS.githubSignIn}`,
  )
  expect(location.searchParams.get(SIGN_IN_RETURN_PARAMETER)).toBe(launch)
  expect(response.headers.get('Cache-Control')).toBe('no-store')
})

it.each([
  ['a frame', { 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Dest': 'iframe' }],
  ['a fetch', { 'Sec-Fetch-Mode': 'cors', 'Sec-Fetch-Dest': 'empty' }],
  ['a browser without fetch metadata', {}],
])('keeps the JSON refusal for %s', async (_name, headers) => {
  const response = await harness.fetch(launch, { headers })
  expect(response.status).toBe(401)
  expect(await response.json()).toMatchObject({
    error: { code: 'sign_in_required' },
  })
})

it('keeps the JSON refusal for a signed-out page load of another API address', async () => {
  const response = await harness.fetch(API_PATHS.session, { headers: page })
  expect(response.status).toBe(401)
})

it('carries the return address through Terms and back to the preview launch', async () => {
  // The first sign-in creates the account and gives it app access.
  await harness.login()
  harness.env.ASSETS = fakeSite()
  const consent = await harness.fetch(
    withReturn(API_PATHS.githubSignIn, launch),
  )
  const continuation = await termsContinuation(consent)
  expect(
    new URL(continuation, TEST_ORIGIN).searchParams.get(
      SIGN_IN_RETURN_PARAMETER,
    ),
  ).toBe(launch)
  const callback = await finish(await harness.fetch(continuation))
  expect(callback.status).toBe(302)
  expect(callback.headers.get('Location')).toBe(`${TEST_ORIGIN}${launch}`)
})

it('keeps a person without app access at the waitlist of the app root', async () => {
  const callback = await finish(
    await harness.fetch(withReturn(acceptedTermsSignInPath(), launch)),
  )
  expect(callback.status).toBe(302)
  expect(callback.headers.get('Location')).toBe(TEST_ORIGIN)
})

it('ignores a return address that is not a preview launch', async () => {
  const callback = await finish(
    await harness.fetch(
      withReturn(acceptedTermsSignInPath(), 'https://evil.example/'),
    ),
  )
  expect(callback.status).toBe(302)
  expect(callback.headers.get('Location')).toBe(TEST_ORIGIN)
})
