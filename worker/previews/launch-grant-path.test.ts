import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { previewLaunchUrl } from '../../src/shared/previews'
import { saveOAuthState } from '../data/users'
import { isRecord } from '../http'
import { decrypt, encrypt, hash } from '../security/crypto'
import { TEST_ORIGIN, TEST_TIME } from '../test-support/harness'
import { handoffRequest, launchForm } from './launch-test-support'
import { openPreview } from './stream-test-support'
import { createToolsHarness, type ToolsHarness } from './test-support'

let harness: ToolsHarness
beforeAll(async () => {
  harness = await createToolsHarness()
})
beforeEach(() => harness.resetTools())
afterAll(() => harness.dispose())

type Form = ReturnType<typeof launchForm>
type Mode = 'form' | 'header'
type Purpose = 'launch' | 'cookie'

async function launch(
  setup: Awaited<ReturnType<typeof openPreview>>,
  path: string,
) {
  const url = new URL(previewLaunchUrl(setup.preview, path))
  const response = await setup.handler.fetch(
    setup.request(url.pathname + url.search),
  )
  expect(response.status).toBe(200)
  return launchForm(await response.text())
}

function credentialContext(form: Form, token: string, purpose: Purpose) {
  const previewId = token.slice(0, token.indexOf('.'))
  return `conductive:preview:${purpose}:${harness.env.APP_ORIGIN}:${form.body.get('hostname')}:${previewId}`
}

async function credential(form: Form, token: string, purpose: Purpose) {
  const value: unknown = JSON.parse(
    await decrypt(
      token.slice(token.indexOf('.') + 1),
      credentialContext(form, token, purpose),
      harness.env.BOAT_KEY_ENCRYPTION_KEY,
    ),
  )
  if (!isRecord(value)) throw new Error('Missing preview credential payload')
  return value
}

async function replaceGrant(form: Form, payload: Record<string, unknown>) {
  const previous = form.body.get('grant') ?? ''
  const previewId = previous.slice(0, previous.indexOf('.'))
  const encrypted = await encrypt(
    JSON.stringify(payload),
    credentialContext(form, previous, 'launch'),
    harness.env.BOAT_KEY_ENCRYPTION_KEY,
  )
  const token = `${previewId}.${encrypted}`
  await register(token)
  form.body.set('grant', token)
  return token
}

async function register(token: string) {
  await saveOAuthState(
    harness.env.DB,
    await hash(`preview:${token}`),
    TEST_TIME + 60_000,
    TEST_TIME,
  )
}

async function grantCount(token: string) {
  return harness.env.DB.prepare(
    'SELECT COUNT(*) AS count FROM oauth_states WHERE state_hash = ?',
  )
    .bind(await hash(`preview:${token}`))
    .first<{ count: number }>()
}

function authorize(form: Form, mode: Mode) {
  if (mode === 'form') return handoffRequest(form, TEST_ORIGIN)
  const url = new URL(form.action)
  const query = new URLSearchParams(form.body)
  query.delete('grant')
  url.search = query.toString()
  return new Request(url, {
    method: 'POST',
    headers: {
      Origin: url.origin,
      Authorization: `Bearer ${form.body.get('grant')}`,
    },
  })
}

async function destination(response: Response, mode: Mode) {
  expect(response.status).toBe(mode === 'form' ? 303 : 200)
  return mode === 'form'
    ? { url: response.headers.get('Location') }
    : response.json()
}

it('uses the encrypted grant path before request fields and leaves it out of credential cookies', async () => {
  const setup = await openPreview(harness)
  harness.requests.length = 0
  for (const mode of ['form', 'header'] as const) {
    const form = await launch(setup, 'reports/private\npage.html')
    const token = form.body.get('grant') ?? ''
    const payload = await credential(form, token, 'launch')
    expect(payload.path).toBe('reports/private\npage.html')
    expect(token).not.toContain('reports/private')
    form.body.set('path', 'reports/untrusted.html')
    const response = await setup.handler.proxy(authorize(form, mode))
    expect(await destination(response, mode)).toEqual({
      url: `${setup.previewUrl}/reports/private%0Apage.html`,
    })
    const cookie = response.headers.getSetCookie()[0]?.split(';')[0] ?? ''
    const sealed = cookie.slice(cookie.indexOf('=') + 1)
    const viewer = await credential(form, sealed, 'cookie')
    expect(viewer).not.toHaveProperty('path')
    expect(viewer).toMatchObject({
      kind: 'preview',
      previewId: setup.preview.id,
      expiresAt: setup.preview.expiresAt,
    })
  }
  expect(harness.requests).toHaveLength(0)
})

it('uses legacy request paths for encrypted grants with no path in both authorization modes', async () => {
  const setup = await openPreview(harness)
  harness.requests.length = 0
  for (const mode of ['form', 'header'] as const) {
    const form = await launch(setup, 'reports/new.html')
    const payload = await credential(
      form,
      form.body.get('grant') ?? '',
      'launch',
    )
    delete payload.path
    const token = await replaceGrant(form, payload)
    form.body.set('path', 'reports/legacy.html')
    const response = await setup.handler.proxy(authorize(form, mode))
    expect(await destination(response, mode)).toEqual({
      url: `${setup.previewUrl}/reports/legacy.html`,
    })
    expect(response.headers.getSetCookie()).toHaveLength(1)
    expect(await grantCount(token)).toEqual({ count: 0 })
  }
  expect(harness.requests).toHaveLength(0)
})

it('rejects changed ciphertext and invalid encrypted paths before consuming their grants', async () => {
  const setup = await openPreview(harness)
  harness.requests.length = 0
  const form = await launch(setup, 'reports/index.html')
  const original = form.body.get('grant') ?? ''
  const payload = await credential(form, original, 'launch')
  const ciphertext = original.lastIndexOf('.') + 1
  const changed =
    original.slice(0, ciphertext) +
    (original[ciphertext] === 'a' ? 'b' : 'a') +
    original.slice(ciphertext + 1)
  await register(changed)
  const invalid = [changed]
  for (const path of [null, 7, '', '../index.html', 'reports/\0.html'])
    invalid.push(await replaceGrant(form, { ...payload, path }))
  for (const token of invalid) {
    form.body.set('grant', token)
    const response = await setup.handler.proxy(authorize(form, 'form'))
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      error: {
        code: 'preview_not_found',
        message: 'The preview is not available.',
      },
    })
    expect(response.headers.getSetCookie()).toEqual([])
    expect(await grantCount(token)).toEqual({ count: 1 })
  }
  form.body.set('grant', original)
  const accepted = await setup.handler.proxy(authorize(form, 'form'))
  expect(await destination(accepted, 'form')).toEqual({
    url: `${setup.previewUrl}/reports/index.html`,
  })
  expect(harness.requests).toHaveLength(0)
})
