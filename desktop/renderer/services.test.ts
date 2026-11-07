// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest'

import { API_PATHS } from '../../src/shared/api'
import { workspaceEventsPath } from '../../src/shared/events'
import { createDesktopServices } from './services'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('uses the configured Worker for credentialed API requests and workspace sockets', async () => {
  const fetch = vi
    .spyOn(window, 'fetch')
    .mockResolvedValue(Response.json({ status: 'ready' }))
  const addresses: string[] = []
  const close = vi.fn()
  class Socket extends EventTarget {
    constructor(url: string | URL) {
      super()
      addresses.push(String(url))
    }
    close = close
  }
  vi.stubGlobal('WebSocket', Socket)
  const services = createDesktopServices(
    window,
    'https://worker.conducting.test',
  )
  expect(await services.api.get(API_PATHS.session, (body) => body)).toEqual({
    status: 'ready',
  })
  expect(fetch).toHaveBeenCalledWith(
    'https://worker.conducting.test/api/session',
    {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'include',
    },
  )
  const stop = services.events.open(
    { orgId: 'org-one', workspaceId: 'workspace-one', afterEventNumber: 7 },
    { message: () => {}, closed: () => {} },
  )
  expect(addresses).toEqual([
    'wss://worker.conducting.test' +
      workspaceEventsPath('org-one', 'workspace-one', 7),
  ])
  stop()
  expect(close).toHaveBeenCalledOnce()
})
