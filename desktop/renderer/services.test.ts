// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { parseRoute, routes } from '../../src/app/router'
import { webLink } from '../../src/markdown/web-links'
import { API_PATHS } from '../../src/shared/api'
import { workspaceEventsPath } from '../../src/shared/events'
import { attachmentUploadPartPath } from '../../src/shared/messages'
import { terminalPaths } from '../../src/shared/terminal'
import { joinPath } from '../../src/shared/waitlist'
import { createDesktopServices } from './services'

const pageAddress = window.location.href

beforeEach(() => {
  window.location.href = 'conductive-app://desktop'
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  window.location.href = pageAddress
})

it('copies an invite join link on the configured Worker from the desktop page', async () => {
  const write = vi
    .spyOn(window.navigator.clipboard, 'writeText')
    .mockResolvedValue()
  const services = createDesktopServices(
    window,
    'https://worker.conductive.test',
  )
  await services.copy(new URL(joinPath('test-code'), services.appOrigin).href)
  expect(write).toHaveBeenCalledWith(
    'https://worker.conductive.test/join/test-code',
  )
  expect(services.appOrigin).toBe('https://worker.conductive.test')
})

it('classifies a configured Worker app page as an app link from the desktop page', () => {
  const services = createDesktopServices(
    window,
    'https://worker.conductive.test',
  )
  const path = routes.accountTab('agents')
  const href = `https://worker.conductive.test${path}`
  expect(
    webLink(href, {
      appOrigin: services.appOrigin,
      isAppPage: (url) =>
        parseRoute(url.pathname, url.search).screen !== 'not-found',
    }),
  ).toEqual({ kind: 'app', url: new URL(href), to: path })
})

it('uses the configured Worker for credentialed API requests and workspace sockets', async () => {
  const assign = vi
    .spyOn(window.location, 'assign')
    .mockImplementation(() => {})
  const open = vi.spyOn(window, 'open').mockReturnValue(null)
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
  expect(services.platform).toBe('mac')
  expect(services.host).toEqual({ kind: 'mac-app', system: 'mac' })
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
  const raw: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
    signal: new AbortController().signal,
    credentials: 'omit',
  }
  await services.api.fetch(API_PATHS.session, raw)
  expect(fetch).toHaveBeenLastCalledWith(
    'https://worker.conductive.test/api/session',
    { ...raw, credentials: 'include' },
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
  const terminal = services.events.openSocket?.(
    terminalPaths.socket('org-one', 'workspace-one'),
    'tty',
  )
  expect(addresses.at(-1)).toBe(
    'wss://worker.conductive.test' +
      terminalPaths.socket('org-one', 'workspace-one'),
  )
  terminal?.close()
  expect(close).toHaveBeenCalledTimes(2)
  services.leave(API_PATHS.githubSignIn)
  expect(assign).toHaveBeenLastCalledWith(
    'https://worker.conductive.test/api/auth/github',
  )
  services.leave('https://github.com/apps/conductive')
  expect(assign).toHaveBeenLastCalledWith('https://github.com/apps/conductive')
  services.openInNewTab('https://github.com/apps/conductive')
  expect(open).toHaveBeenCalledWith(
    'https://github.com/apps/conductive',
    '_blank',
    'noreferrer',
  )
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
