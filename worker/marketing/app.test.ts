import { afterAll, beforeAll, expect, it } from 'vitest'

import { API_PATHS } from '../../src/shared/api'
import { SITE_FOLDER, TERMS_CONSENT_PAGE } from '../../src/shared/site-build'
import { acceptedTermsSignInPath } from '../../src/shared/terms'
import {
  FAKE_PICTURE,
  FILE_LIST_PATH,
  fakeSite,
} from '../test-support/fake-site'
import { createHarness, type TestHarness } from '../test-support/harness'
import { APP_PAGE } from '../test-support/site-binding'
import { decodeHtml, links } from './html.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
afterAll(async () => {
  await harness.dispose()
})

it('serves the agreement at sign-in and keeps the desktop challenge in Continue', async () => {
  harness.env.ASSETS = fakeSite()
  harness.env.MARKETING_ORIGIN = 'https://conductive.test'
  const challenge = 'a'.repeat(43)
  const response = await harness.fetch(
    `${API_PATHS.githubSignIn}?desktop_challenge=${challenge}`,
  )
  expect(response.status).toBe(200)
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  const pageLinks = links(await response.text())
  expect(
    decodeHtml(
      pageLinks.find((link) => link.text === 'Continue with GitHub')?.href ??
        '',
    ),
  ).toBe(`${acceptedTermsSignInPath()}&desktop_challenge=${challenge}`)
  expect(pageLinks.find((link) => link.text === 'Terms')?.href).toBe(
    'https://conductive.test/terms',
  )
  expect(pageLinks.find((link) => link.text === 'Privacy')?.href).toBe(
    'https://conductive.test/privacy',
  )
})

it('serves listed site files on the app host and uses the app for all other site paths', async () => {
  harness.env.ASSETS = fakeSite()
  const file = await harness.fetch(FAKE_PICTURE)
  expect(file.status).toBe(200)
  expect(await file.text()).toBe('picture')
  for (const path of [
    `/${SITE_FOLDER}/terms`,
    `/${SITE_FOLDER}/terms.html`,
    FILE_LIST_PATH,
    `/${SITE_FOLDER}/${TERMS_CONSENT_PAGE}`,
    `/${SITE_FOLDER}/missing`,
  ]) {
    const response = await harness.fetch(path)
    expect(response.status, path).toBe(200)
    expect(await response.text(), path).toBe(APP_PAGE)
    expect(response.headers.get('Content-Security-Policy'), path).toContain(
      "script-src 'self'",
    )
  }
})
