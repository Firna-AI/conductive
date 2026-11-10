// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest'

import { API_PATHS } from '../../src/shared/api'
import { workspaceEventsPath } from '../../src/shared/events'
import { attachmentUploadUrl } from '../../src/shared/messages'
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

it('uploads a raw file to the configured Worker with the session cookie', async () => {
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
      this.status = 201
      this.responseText = JSON.stringify({ id: 'upload-1' })
      this.load()
    }
    abort() {}
  }
  vi.stubGlobal('XMLHttpRequest', FakeUpload)
  const services = createDesktopServices(
    window,
    'https://worker.conductive.test',
  )
  const file = new File(['png'], 'overlap.png', { type: 'image/png' })
  const path = attachmentUploadUrl(
    'org-one',
    { type: 'workspace', workspaceId: 'workspace-one' },
    { name: file.name, mediaType: file.type },
  )
  const reply = await services.api.sendFile(path, file, (body) => body, {
    progress: () => {},
    signal: new AbortController().signal,
  })
  expect({ reply, opened, sent, seen }).toEqual({
    reply: { id: 'upload-1' },
    opened: [`https://worker.conductive.test${path}`],
    sent: [file],
    seen: [
      {
        credentials: true,
        headers: [['Content-Type', 'application/octet-stream']],
      },
    ],
  })
})
