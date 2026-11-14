// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest'

import { API_PATHS } from '../../src/shared/api'
import { workspaceEventsPath } from '../../src/shared/events'
import { attachmentUploadPartPath } from '../../src/shared/messages'
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
    'https://worker.conductive.test',
  )
  expect(await services.api.get(API_PATHS.session, (body) => body)).toEqual({
    status: 'ready',
  })
  expect(fetch).toHaveBeenCalledWith(
    'https://worker.conductive.test/api/session',
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
    'wss://worker.conductive.test' +
      workspaceEventsPath('org-one', 'workspace-one', 7),
  ])
  stop()
  expect(close).toHaveBeenCalledOnce()
})

it('uploads a raw part to the configured Worker with the session cookie', async () => {
  const opened: string[] = []
  const sent: Blob[] = []
  const seen: { credentials: boolean; headers: [string, string][] }[] = []
  class FakeUpload {
    withCredentials = false
    status = 0
    responseText = ''
    readonly headers: [string, string][] = []
    readonly upload = { addEventListener: () => {} }
    private load: () => void = () => {}
    open(_method: string, url: string) {
      opened.push(url)
    }
    setRequestHeader(name: string, value: string) {
      this.headers.push([name, value])
    }
    addEventListener(type: string, listener: () => void) {
      if (type === 'load') this.load = listener
    }
    send(body: Blob) {
      sent.push(body)
      seen.push({ credentials: this.withCredentials, headers: this.headers })
      this.status = 200
      this.responseText = JSON.stringify({ partNumber: 1, etag: 'etag-1' })
      this.load()
    }
    abort() {}
  }
  vi.stubGlobal('XMLHttpRequest', FakeUpload)
  const services = createDesktopServices(
    window,
    'https://worker.conductive.test',
  )
  const part = new File(['png'], 'overlap.png', { type: 'image/png' })
  const path = attachmentUploadPartPath(
    'org-one',
    { type: 'workspace', workspaceId: 'workspace-one' },
    'upload-1',
    1,
  )
  const reply = await services.api.sendPart(path, part, (body) => body, {
    progress: () => {},
    signal: new AbortController().signal,
  })
  expect({ reply, opened, sent, seen }).toEqual({
    reply: { partNumber: 1, etag: 'etag-1' },
    opened: [`https://worker.conductive.test${path}`],
    sent: [part],
    seen: [
      {
        credentials: true,
        headers: [['Content-Type', 'application/octet-stream']],
      },
    ],
  })
})
