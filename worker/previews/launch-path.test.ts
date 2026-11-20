import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  previewLaunchUrl,
  type PreviewLaunchResponse,
} from '../../src/shared/previews'
import { TEST_ORIGIN } from '../test-support/harness'
import { handoffRequest, launchForm } from './launch-test-support'
import { openPreview } from './stream-test-support'
import { createToolsHarness, type ToolsHarness } from './test-support'

let harness: ToolsHarness
beforeAll(async () => {
  harness = await createToolsHarness()
})
beforeEach(async () => {
  await harness.resetTools()
})
afterAll(async () => {
  await harness.dispose()
})

type Mode = 'form' | 'header'

async function readLaunch(
  setup: Awaited<ReturnType<typeof openPreview>>,
  mode: Mode,
  path?: string,
) {
  const url = new URL(previewLaunchUrl(setup.preview, path))
  const response = await setup.handler.fetch(
    setup.request(url.pathname + url.search, {
      headers: { Accept: mode === 'form' ? 'text/html' : 'application/json' },
    }),
  )
  expect(response.status).toBe(200)
  if (mode === 'form') return launchForm(await response.text())
  const launch: PreviewLaunchResponse = await response.json()
  const target = new URL(launch.url)
  expect(target.search).toBe('')
  const body = new URLSearchParams(target.hash.slice(1))
  target.hash = ''
  return { action: target.href, body }
}

function authorize(mode: Mode, form: ReturnType<typeof launchForm>) {
  if (mode === 'form') return handoffRequest(form, TEST_ORIGIN)
  const url = new URL(form.action)
  for (const [name, value] of form.body) {
    if (name !== 'grant') url.searchParams.append(name, value)
  }
  return new Request(url, {
    method: 'POST',
    headers: {
      Origin: url.origin,
      Authorization: `Bearer ${form.body.get('grant')}`,
    },
  })
}

it.each(['form', 'header'] as const)(
  'keeps file paths on the preview hostname in a %s launch',
  async (mode) => {
    const setup = await openPreview(harness)
    harness.requests.length = 0
    for (const [path, pathname] of [
      [undefined, '/'],
      ['reports/index.html', '/reports/index.html'],
      ['\\/evil.example/x', '/%5C/evil.example/x'],
      ['reports/%2F.html', '/reports/%252F.html'],
      ['a b/café/你好.html', '/a%20b/caf%C3%A9/%E4%BD%A0%E5%A5%BD.html'],
    ]) {
      const form = await readLaunch(setup, mode, path)
      expect(form.body.getAll('path'), path).toEqual(
        path === undefined ? [] : [path],
      )
      const response = await setup.handler.proxy(authorize(mode, form))
      expect(response.status, path).toBe(mode === 'form' ? 303 : 200)
      expect(response.headers.getSetCookie()).toHaveLength(1)
      const result: Pick<PreviewLaunchResponse, 'url'> =
        mode === 'form'
          ? { url: response.headers.get('Location') ?? '' }
          : await response.json()
      expect(result, path).toEqual({ url: setup.previewUrl + pathname })
    }
    expect(harness.requests).toHaveLength(0)
  },
)

const invalidPaths = [
  [''],
  ['.'],
  ['..'],
  ['../index.html'],
  ['reports/./index.html'],
  ['/index.html'],
  ['reports//index.html'],
  ['reports/'],
  ['reports/\0.html'],
  ['reports/index.html', 'other.html'],
]

async function grantCount() {
  return harness.env.DB.prepare(
    'SELECT COUNT(*) AS count FROM oauth_states',
  ).first<{ count: number }>()
}

it('rejects invalid launch paths with invalid_input and creates no grant', async () => {
  const setup = await openPreview(harness)
  const before = await grantCount()
  for (const paths of invalidPaths) {
    const url = new URL(setup.preview.url)
    for (const path of paths) url.searchParams.append('path', path)
    const response = await setup.handler.fetch(
      setup.request(url.pathname + url.search),
    )
    expect(response.status, JSON.stringify(paths)).toBe(400)
    expect(await response.json()).toEqual({
      error: {
        code: 'invalid_input',
        message: 'Choose a file in this repository.',
      },
    })
    expect(response.headers.getSetCookie()).toEqual([])
  }
  expect(await grantCount()).toEqual(before)
})

it.each(['form', 'header'] as const)(
  'rejects invalid %s authorization paths before using the grant',
  async (mode) => {
    const setup = await openPreview(harness)
    const form = await readLaunch(setup, mode)
    harness.requests.length = 0
    for (const paths of invalidPaths) {
      form.body.delete('path')
      for (const path of paths) form.body.append('path', path)
      const response = await setup.handler.proxy(authorize(mode, form))
      expect(response.status, JSON.stringify(paths)).toBe(404)
      expect(await response.json()).toEqual({
        error: {
          code: 'preview_not_found',
          message: 'The preview is not available.',
        },
      })
      expect(response.headers.getSetCookie()).toEqual([])
    }
    form.body.set('path', 'reports/index.html')
    const accepted = await setup.handler.proxy(authorize(mode, form))
    expect(accepted.status).toBe(mode === 'form' ? 303 : 200)
    expect(accepted.headers.getSetCookie()).toHaveLength(1)
    expect(harness.requests).toHaveLength(0)
  },
)
