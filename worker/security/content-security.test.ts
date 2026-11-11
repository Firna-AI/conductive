import { afterAll, beforeAll, expect, it, vi } from 'vitest'

import {
  contentSecurityPolicy,
  readConfiguration,
} from '../../desktop/src/config'
import { createApp } from '../application'
import { createHarness, type TestHarness } from '../test-support/harness'

const setting = vi.hoisted(() => ({ dsn: '' }))
vi.mock('../../src/shared/error-reporting', async (original) => {
  const actual =
    await original<typeof import('../../src/shared/error-reporting')>()
  return {
    ...actual,
    get BROWSER_ERROR_TRACKING_ORIGIN() {
      return actual.errorTrackingDsnOrigin(setting.dsn)
    },
  }
})

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
afterAll(async () => {
  await harness.dispose()
})

function connections(policy: string | null): string[] {
  return (
    (policy ?? '')
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('connect-src '))
      ?.split(/\s+/)
      .slice(1) ?? []
  )
}

it('gives Worker assets and the Mac window only the checked browser DSN origin', async () => {
  const app = createApp()
  const appOrigin = harness.env.APP_ORIGIN
  const base = ["'self'", appOrigin, appOrigin.replace(/^http/, 'ws')]
  for (const [dsn, origins] of [
    ['', []],
    [
      'https://BrowserKey@s123.eu-nbg-2.betterstackdata.com/123',
      ['https://s123.eu-nbg-2.betterstackdata.com'],
    ],
    ['https://BrowserKey@private.example/123', []],
  ] as const) {
    setting.dsn = dsn
    const response = await app.fetch(new Request(`${appOrigin}/`), {
      ...harness.env,
      ASSETS: { fetch: async () => new Response('<main>App</main>') },
    })
    expect(response.status).toBe(200)
    expect(
      connections(response.headers.get('Content-Security-Policy')),
    ).toEqual([...base, ...origins])
    expect(
      connections(contentSecurityPolicy(readConfiguration({ appOrigin }))),
    ).toEqual([...base, ...origins])
  }
})
