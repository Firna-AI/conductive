import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from 'vitest'

import { createApp } from '../application'
import { FAKE_PICTURE, fakeSite } from '../test-support/fake-site'
import {
  createHarness,
  TEST_ORIGIN,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import * as warnings from '../warnings'
import { links } from './html.test-support'

const SITE = 'https://conductive.test'
let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => harness.reset())
afterEach(() => vi.restoreAllMocks())
afterAll(async () => harness.dispose())

function siteClient(db = harness.env.DB) {
  let now = TEST_TIME
  const app = createApp({ now: () => now })
  const env = {
    ...harness.env,
    DB: db,
    ASSETS: fakeSite(),
    MARKETING_ORIGIN: SITE,
  }
  return {
    get: (path: string) => app.fetch(new Request(new URL(path, SITE)), env),
    setTime: (value: number) => {
      now = value
    },
  }
}

async function signups(waitlistOn: boolean, paused = false) {
  await harness.env.DB.prepare(
    'UPDATE signup_settings SET waitlist_on = ?, paused = ? WHERE id = 1',
  )
    .bind(waitlistOn ? 1 : 0, paused ? 1 : 0)
    .run()
}

function startLabels(page: string) {
  return links(page)
    .filter(
      (link) => link.href === `${TEST_ORIGIN}/` && link.text !== 'Sign in',
    )
    .map((link) => link.text)
}

async function pageLabels(response: Response) {
  expect(response.status).toBe(200)
  return startLabels(await response.text())
}

it('fills both site action labels from live sign-up settings after the 60-second cache expires and lets the pause win', async () => {
  const client = siteClient()
  expect(await pageLabels(await client.get('/'))).toEqual([
    'Join the waitlist',
    'Join the waitlist',
  ])
  await signups(false)
  client.setTime(TEST_TIME + 59_999)
  expect(await pageLabels(await client.get('/terms'))).toEqual([
    'Join the waitlist',
    'Join the waitlist',
  ])
  client.setTime(TEST_TIME + 60_000)
  expect(await pageLabels(await client.get('/'))).toEqual([
    'Start free with GitHub',
    'Start free with GitHub',
  ])
  await signups(false, true)
  client.setTime(TEST_TIME + 119_999)
  expect(await pageLabels(await client.get('/terms'))).toEqual([
    'Start free with GitHub',
    'Start free with GitHub',
  ])
  client.setTime(TEST_TIME + 120_000)
  expect(await pageLabels(await client.get('/terms'))).toEqual([
    'Join the waitlist',
    'Join the waitlist',
  ])
})

it('keeps a working page with the waitlist label and a safe warning after a settings read fails and serves assets without D1', async () => {
  let failReads = false
  let failedReads = 0
  const db = new Proxy(harness.env.DB, {
    get(target, key, receiver) {
      if (key === 'prepare')
        return (query: string) => {
          if (failReads) {
            failedReads += 1
            throw new Error('private database failure')
          }
          return target.prepare(query)
        }
      return Reflect.get(target, key, receiver)
    },
  })
  const client = siteClient(db)
  await signups(false)
  expect(await pageLabels(await client.get('/'))).toEqual([
    'Start free with GitHub',
    'Start free with GitHub',
  ])
  client.setTime(TEST_TIME + 60_000)
  const warn = vi.spyOn(warnings, 'warnWorker').mockImplementation(() => {})
  failReads = true
  const fallback = await client.get('/terms')
  expect(fallback.status).toBe(200)
  const page = await fallback.text()
  expect(page).toContain('Terms')
  expect(startLabels(page)).toEqual(['Join the waitlist', 'Join the waitlist'])
  expect(links(page).find((link) => link.text === 'Sign in')?.href).toBe(
    `${TEST_ORIGIN}/`,
  )
  expect(warn.mock.calls).toEqual([
    ['The marketing sign-up settings are not available.'],
  ])
  expect(failedReads).toBe(1)
  const asset = await client.get(FAKE_PICTURE)
  expect(asset.status).toBe(200)
  expect(await asset.text()).toBe('picture')
  expect(failedReads).toBe(1)
})
