import { Client, parseEnvelope } from '@sentry/core'
import { close, endSession, getClient, makeFetchTransport } from '@sentry/react'
import { afterEach, beforeEach, expect, vi } from 'vitest'

import {
  startBrowserErrorReporting,
  type BrowserErrorOptions,
} from './error-reporting'
import { memoryNavigation } from './navigation'

export const browserRelease =
  'conductive@1111111111111111111111111111111111111111'
export const browserTime = 1_700_000_000_000
export const browserDsn =
  'https://BrowserKey@s123.eu-nbg-2.betterstackdata.com/123'
export const bundleAddress =
  'https://app.conductive.build/assets/index-real123.js'
export const bundleDebugId = '6f5287e1-35fc-45c3-84fe-b7ae90046d00'

const debugRegistry: Record<string, string> = {}
let registration = 0

afterEach(async () => {
  endSession()
  await close()
  vi.restoreAllMocks()
})

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(browserTime)
})

export function registerBrowserBundle(address = bundleAddress): void {
  registration += 1
  debugRegistry[`Error\n    at register (${address}:1:${registration})`] =
    bundleDebugId
  vi.stubGlobal('_sentryDebugIds', debugRegistry)
}

export function browserFailure(
  message = 'private-message',
  address = bundleAddress,
): Error {
  const error = new TypeError(message)
  Object.defineProperty(error, 'stack', {
    configurable: true,
    value: `TypeError: ${message}\n    at renderWorkspace (${address}:152:37)`,
  })
  return error
}

type BrowserOverrides = Partial<
  Omit<BrowserErrorOptions, 'platform' | 'appOrigin'>
> &
  ({ platform?: 'web' } | { platform: 'mac'; appOrigin: string })

export function browserReporter(overrides: BrowserOverrides = {}) {
  const sent: { address: string; init: RequestInit }[] = []
  const navigation = memoryNavigation(
    '/orgs/private-org/workspaces/private-workspace/files/private.txt?token=private-query',
  )
  const nativeFetch: typeof fetch = async (input, init) => {
    sent.push({ address: String(input), init: init ?? {} })
    return new Response(null, { status: 202 })
  }
  const options = {
    target: {
      location: { origin: 'https://app.conductive.build' },
      navigator: {
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36',
      },
    },
    navigation,
    now: () => browserTime,
    build: { production: true, dsn: browserDsn, release: browserRelease },
    transport: (options: Parameters<typeof makeFetchTransport>[0]) =>
      makeFetchTransport(options, nativeFetch),
    ...overrides,
  }
  const reporting = startBrowserErrorReporting(
    overrides.platform === 'mac'
      ? { ...options, platform: 'mac', appOrigin: overrides.appOrigin }
      : { ...options, platform: 'web' },
  )
  return { reporting, sent, navigation }
}

export function browserClient(): Client {
  const client = getClient()
  expect(client).toBeInstanceOf(Client)
  if (!client) throw new Error('Expected the initialized SDK client.')
  return client
}

export function sentEvent(request: { init: RequestInit }) {
  const body = request.init.body
  if (typeof body !== 'string')
    throw new Error('Expected a serialized event envelope.')
  const envelope = parseEnvelope(body)
  const [item] = envelope[1]
  if (!item || item[0].type !== 'event')
    throw new Error('Expected an event item.')
  return { headers: envelope[0], items: envelope[1], event: item[1] }
}
