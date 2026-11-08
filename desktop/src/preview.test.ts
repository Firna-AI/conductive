import { expect, it, vi } from 'vitest'

import { DESKTOP_ORIGIN } from '../../worker/security/desktop-contract.js'
import { openPreviewInBrowser } from './preview.js'

it('fetches a preview grant with the native cookie jar and opens only its trusted fragment URL', async () => {
  const launcher =
    'https://app.conductive.test/api/orgs/org/workspaces/workspace/previews/preview'
  const destination =
    'https://authorize.conductive-previews.test/.conductive/authorize#hostname=0123456789abcdef0123456789abcdef.conductive-previews.test&grant=opaque'
  const fetch = vi.fn<(request: Request) => Promise<Response>>(async () =>
    Response.json({ url: destination, expiresAt: 1_800_000_060_000 }),
  )
  const external = vi.fn<(url: string) => Promise<void>>(async () => {})
  const dependencies = {
    appOrigin: 'https://app.conductive.test',
    frameSources: ['https://*.conductive-previews.test'],
    fetch,
    external,
  }
  await openPreviewInBrowser(launcher, dependencies)
  expect(fetch).toHaveBeenCalledTimes(1)
  const request = fetch.mock.calls[0][0]
  expect(request.url).toBe(launcher)
  expect(request.headers.get('Origin')).toBe(DESKTOP_ORIGIN)
  expect(request.headers.get('Accept')).toBe('application/json')
  expect(request.headers.get('Cookie')).toBe(null)
  expect(request.credentials).toBe('include')
  expect(request.redirect).toBe('error')
  expect(external).toHaveBeenCalledExactlyOnceWith(destination)
  for (const url of [
    'https://foreign.test/steal#grant=opaque',
    destination.replace('#', '?'),
    'file:///etc/passwd',
  ]) {
    fetch.mockImplementationOnce(async () =>
      Response.json({ url, expiresAt: 1_800_000_060_000 }),
    )
    await expect(openPreviewInBrowser(launcher, dependencies)).rejects.toThrow(
      'Invalid preview handoff',
    )
  }
  expect(external).toHaveBeenCalledTimes(1)
})
