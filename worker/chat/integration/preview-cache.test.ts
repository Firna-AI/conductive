import { afterEach, beforeAll, expect, it } from 'vitest'

import {
  PREVIEW_RELAY_MARK_HEADER,
  PREVIEW_RELAY_PORT,
  previewPath,
} from '../../../src/shared/previews'
import { assignSandbox } from '../../lifecycle/workspace-data'
import { launchForm } from '../../previews/launch-test-support'
import { insertPreview } from '../../previews/store'
import { DEFAULT_PROVIDER_ACCOUNT } from '../../sandbox/account-identity'
import {
  createOuterRuntime,
  outerWorkerBundle,
  type OuterRuntime,
} from './outer-runtime.test-support'
import { OUTER_ORG, OUTER_WORKSPACE } from './outer-seed.test-support'

let bundle: string
let fixture: OuterRuntime | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle()
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

/** Answers the relay check, the relay port, and the previewed server with `reply`. */
function sandboxNetwork(reply: () => { status: number; headers: HeadersInit }) {
  return async (
    request: Request,
    fallback: (request: Request) => Promise<Response>,
  ) => {
    const url = new URL(request.url)
    if (url.hostname.endsWith('.on.boat.dev')) {
      const { status, headers } = reply()
      const response = new Response(status === 304 ? null : 'preview content', {
        status,
        headers,
      })
      response.headers.set(PREVIEW_RELAY_MARK_HEADER, '1')
      return response
    }
    if (url.hostname === 'boat.dev' && url.pathname.endsWith('/host'))
      return Response.json({
        ok: true,
        type: 'port.hosted',
        port: PREVIEW_RELAY_PORT,
        url: `https://sandbox-${PREVIEW_RELAY_PORT}.on.boat.dev?_token=port-token`,
        access: 'private',
        isProtected: true,
      })
    if (url.hostname === 'boat.dev' && url.pathname.endsWith('/commands'))
      return Response.json({
        ok: true,
        type: 'command.finished',
        exitCode: 0,
        stdout: '',
        stderr: '',
        timedOut: false,
      })
    return fallback(request)
  }
}

it("gives the browser the previewed server's cache rules for its own use only", async () => {
  let reply: { status: number; headers: Record<string, string> } = {
    status: 200,
    headers: {},
  }
  const active = (fixture = await createOuterRuntime(bundle, {
    configuration: { PREVIEW_DOMAIN: 'conductive-previews.test' },
    outbound: sandboxNetwork(() => reply),
  }))
  const now = Date.now()
  const preview = {
    orgId: OUTER_ORG,
    workspaceId: OUTER_WORKSPACE,
    sandboxId: 'bx_preview',
    providerAccount: DEFAULT_PROVIDER_ACCOUNT,
    state: 'ready' as const,
    id: 'cache-preview',
    hostname: `${'c'.repeat(32)}.conductive-previews.test`,
    port: 3000,
    expiresAt: now + 86_400_000,
  }
  await assignSandbox(
    active.env.DB,
    OUTER_ORG,
    OUTER_WORKSPACE,
    preview.sandboxId,
    preview.providerAccount,
  )
  await insertPreview(active.env.DB, preview, preview, 'owner', now)
  const page = await active.request(
    previewPath(OUTER_ORG, OUTER_WORKSPACE, preview.id),
  )
  const form = launchForm(await page.text())
  const handoff = await active.runtime.dispatchFetch(form.action, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      Origin: active.env.APP_ORIGIN,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.body.toString(),
  })
  const cookie = handoff.headers.getSetCookie()[0].split(';')[0]
  const date = 'Tue, 10 Nov 2026 12:00:00 GMT'
  const expires = 'Wed, 11 Nov 2026 12:00:00 GMT'
  for (const { status, upstream, expected } of [
    {
      status: 200,
      upstream: { 'Cache-Control': 'max-age=31536000,immutable' },
      expected: { 'Cache-Control': 'private, max-age=31536000,immutable' },
    },
    {
      status: 200,
      upstream: { 'Cache-Control': 'public, max-age=600' },
      expected: { 'Cache-Control': 'private, public, max-age=600' },
    },
    {
      status: 200,
      upstream: {
        'Cache-Control': 'private="Set-Cookie, Authorization", no-store',
      },
      expected: {
        'Cache-Control':
          'private, no-cache, private="Set-Cookie, Authorization", no-store',
      },
    },
    {
      status: 200,
      upstream: { 'Cache-Control': 'max-age=abc' },
      expected: { 'Cache-Control': 'private, no-cache, max-age=abc' },
    },
    {
      status: 200,
      upstream: { 'Cache-Control': 'max-age=60', Age: '120', Date: date },
      expected: {
        'Cache-Control': 'private, max-age=60',
        Age: '120',
        Date: date,
      },
    },
    {
      status: 200,
      upstream: { Expires: expires },
      expected: { 'Cache-Control': 'private', Expires: expires },
    },
    {
      status: 200,
      upstream: {},
      expected: { 'Cache-Control': 'private, no-cache' },
    },
    { status: 304, upstream: {}, expected: { 'Cache-Control': null } },
  ]) {
    reply = { status, headers: upstream }
    const response = await active.runtime.dispatchFetch(
      `https://${preview.hostname}/`,
      { headers: { Cookie: cookie } },
    )
    await response.arrayBuffer()
    const sent = Object.fromEntries(
      Object.keys(expected).map((name) => [name, response.headers.get(name)]),
    )
    expect({ upstream, status: response.status, sent }).toEqual({
      upstream,
      status,
      sent: expected,
    })
  }
  reply = { status: 200, headers: {} }
  const timed = await active.runtime.dispatchFetch(
    `https://${preview.hostname}/`,
    { headers: { Cookie: cookie } },
  )
  await timed.arrayBuffer()
  const steps = (timed.headers.get('Server-Timing') ?? '').split(', ')
  expect(steps.map((step) => step.split(';')[0])).toEqual([
    'lookup',
    'workspace',
    'access',
    'relay',
    'check',
    'upstream',
    'check-after',
  ])
  for (const step of steps) expect(step).toMatch(/^[a-z-]+;dur=\d+$/)
  const unknown = await active.runtime.dispatchFetch(
    `https://${'d'.repeat(32)}.conductive-previews.test/`,
  )
  await unknown.arrayBuffer()
  const uncredentialed = await active.runtime.dispatchFetch(
    `https://${preview.hostname}/`,
  )
  await uncredentialed.arrayBuffer()
  expect(
    [unknown, uncredentialed].map((response) => ({
      status: response.status,
      cacheControl: response.headers.get('Cache-Control'),
      timing: response.headers.get('Server-Timing'),
    })),
  ).toEqual([
    { status: 404, cacheControl: 'no-store', timing: null },
    { status: 404, cacheControl: 'no-store', timing: null },
  ])
})
