import { afterEach, beforeAll, expect, it } from 'vitest'

import { previewPath } from '../../../src/shared/previews'
import { assignSandbox } from '../../lifecycle/workspace-data'
import { launchForm } from '../../previews/launch-test-support'
import { insertPreview } from '../../previews/store'
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

it('keeps the browser preview launch origin through the outer Worker response', async () => {
  const active = (fixture = await createOuterRuntime(bundle, {
    configuration: { PREVIEW_DOMAIN: 'conductive-previews.test' },
  }))
  const now = Date.now()
  const preview = {
    orgId: OUTER_ORG,
    workspaceId: OUTER_WORKSPACE,
    sandboxId: 'bx_preview',
    state: 'ready' as const,
    id: 'outer-preview',
    hostname: `${'a'.repeat(32)}.conductive-previews.test`,
    port: 3000,
    expiresAt: now + 86_400_000,
  }
  await assignSandbox(
    active.env.DB,
    OUTER_ORG,
    OUTER_WORKSPACE,
    preview.sandboxId,
  )
  await insertPreview(active.env.DB, preview, preview, 'owner', now)

  const page = await active.request(
    previewPath(OUTER_ORG, OUTER_WORKSPACE, preview.id),
  )
  expect(page.status).toBe(200)
  expect(page.headers.get('Cache-Control')).toBe('no-store')
  expect(page.headers.get('Referrer-Policy')).toBe('origin')
  expect(page.headers.get('X-Content-Type-Options')).toBe('nosniff')
  const form = launchForm(await page.text())
  const post = (origin: string) =>
    active.runtime.dispatchFetch(form.action, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        Origin: origin,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.body.toString(),
    })

  const denied = await post('null')
  expect(denied.status).toBe(404)
  expect(denied.headers.get('Referrer-Policy')).toBe('no-referrer')
  expect(await denied.json()).toEqual({
    error: {
      code: 'preview_not_found',
      message: 'The preview is not available.',
    },
  })

  const handoff = await post(active.env.APP_ORIGIN)
  expect(handoff.status).toBe(303)
  expect(handoff.headers.get('Location')).toBe(`https://${preview.hostname}/`)
  expect(handoff.headers.get('Referrer-Policy')).toBe('no-referrer')
  expect(handoff.headers.getSetCookie()).toHaveLength(1)
  const cookie = handoff.headers.getSetCookie()[0]
  expect(cookie).toContain(`__Secure-conductive-preview-${preview.id}=`)
  expect(cookie).toContain(
    '; Domain=conductive-previews.test; Path=/; HttpOnly; Secure; SameSite=None; Partitioned;',
  )
  expect(active.requests).toEqual([])
})
