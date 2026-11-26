import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  previewLaunchUrl,
  type PreviewLaunchResponse,
} from '../../src/shared/previews'
import { TEST_ORIGIN } from '../test-support/harness'
import { runBrowserLaunch } from './browser-launch-test-support'
import { handoffRequest, launchForm } from './launch-test-support'
import { openPreview } from './stream-test-support'
import { createToolsHarness, type ToolsHarness } from './test-support'

let harness: ToolsHarness
beforeAll(async () => {
  harness = await createToolsHarness()
})
beforeEach(() => harness.resetTools())
afterAll(() => harness.dispose())

it('opens a previous-format browser grant through the current page and handler', async () => {
  const setup = await openPreview(harness)
  const launch = await setup.handler.fetch(
    setup.request(new URL(setup.preview.url).pathname, {
      headers: { Accept: 'application/json' },
    }),
  )
  expect(launch.status).toBe(200)
  const value: PreviewLaunchResponse = await launch.json()
  const authorizer = new URL(value.url)
  const fields = new URLSearchParams(authorizer.hash.slice(1))
  fields.set('path', 'reports/a\rb\nc\r\nd\te\\f.html')
  authorizer.hash = fields.toString()
  const pageUrl = new URL(authorizer)
  pageUrl.hash = ''
  const page = await setup.handler.proxy(new Request(pageUrl))
  expect(page.status).toBe(200)
  harness.requests.length = 0
  const result = await runBrowserLaunch(
    await page.text(),
    authorizer,
    async (url, init) => {
      const headers = new Headers(init.headers)
      headers.set('Origin', url.origin)
      return setup.handler.proxy(new Request(url, { ...init, headers }))
    },
  )
  expect(result.failed).toBe(false)
  expect(result.replace).toHaveBeenCalledExactlyOnceWith(
    `${setup.previewUrl}/reports/a%0Db%0Ac%0D%0Ad%09e%5Cf.html`,
  )
  expect(result.fragments).toEqual([''])
  expect(harness.requests).toHaveLength(0)
})

it('posts the selected file in the current form for the previous request-path reader', async () => {
  const setup = await openPreview(harness)
  const url = new URL(previewLaunchUrl(setup.preview, 'reports/rollback.html'))
  const page = await setup.handler.fetch(
    setup.request(url.pathname + url.search),
  )
  expect(page.status).toBe(200)
  const form = launchForm(await page.text())
  const request = handoffRequest(form, TEST_ORIGIN)
  const previousFields = new URLSearchParams(await request.text())
  expect(previousFields.getAll('path')).toEqual(['reports/rollback.html'])
})
