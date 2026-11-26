// @vitest-environment happy-dom

import { afterEach, describe, expect, test, vi } from 'vitest'
import { API_PATHS } from '../shared/api'
import { workspaceEventsPath } from '../shared/events'
import { attachmentUploadPartPath } from '../shared/messages'
import { terminalPaths } from '../shared/terminal'
import { createLiveServices } from './live-services'

const pageAddress = window.location.href

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  window.location.href = pageAddress
})

describe('createLiveServices', () => {
  test.each([
    ['http://127.0.0.1:5173', 'ws://127.0.0.1:5173'],
    ['https://app.conductive.test:8443', 'wss://app.conductive.test:8443'],
  ])(
    'keeps the browser origin, credentials, navigation, and socket schemes at %s',
    async (appOrigin, socketOrigin) => {
      window.location.href = `${appOrigin}/account`
      const assign = vi
        .spyOn(window.location, 'assign')
        .mockImplementation(() => {})
      const fetch = vi
        .spyOn(window, 'fetch')
        .mockResolvedValue(Response.json({ status: 'ready' }))
      const addresses: [string, string | undefined][] = []
      const close = vi.fn()
      class Socket extends EventTarget {
        constructor(url: string | URL, protocol?: string) {
          super()
          addresses.push([String(url), protocol])
        }
        close = close
      }
      vi.stubGlobal('WebSocket', Socket)
      const services = createLiveServices(window, appOrigin, 'same-origin')
      expect(services.appOrigin).toBe(appOrigin)
      expect(await services.api.get(API_PATHS.session, (body) => body)).toEqual(
        {
          status: 'ready',
        },
      )
      expect(fetch).toHaveBeenLastCalledWith(`${appOrigin}/api/session`, {
        credentials: 'same-origin',
        method: 'GET',
        headers: { Accept: 'application/json' },
      })
      const raw: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'body',
        cache: 'no-store',
        signal: new AbortController().signal,
        credentials: 'omit',
      }
      await services.api.fetch(API_PATHS.session, raw)
      expect(fetch).toHaveBeenLastCalledWith(`${appOrigin}/api/session`, raw)
      await services.api.fetch(API_PATHS.session)
      expect(fetch).toHaveBeenLastCalledWith(`${appOrigin}/api/session`, {
        credentials: 'same-origin',
      })
      const stop = services.events.open(
        { orgId: 'org-one', workspaceId: 'workspace-one', afterEventNumber: 7 },
        { message: () => {}, closed: () => {} },
      )
      const terminal = services.events.openSocket?.(
        terminalPaths.socket('org-one', 'workspace-one'),
        'tty',
      )
      expect(addresses).toEqual([
        [
          socketOrigin + workspaceEventsPath('org-one', 'workspace-one', 7),
          undefined,
        ],
        [
          socketOrigin + terminalPaths.socket('org-one', 'workspace-one'),
          'tty',
        ],
      ])
      stop()
      terminal?.close()
      expect(close).toHaveBeenCalledTimes(2)
      services.leave(API_PATHS.githubSignIn)
      expect(assign).toHaveBeenLastCalledWith(`${appOrigin}/api/auth/github`)
      services.leave('https://github.com/apps/conductive')
      expect(assign).toHaveBeenLastCalledWith(
        'https://github.com/apps/conductive',
      )
    },
  )

  test('uploads a raw part on the page origin with the cookie and measured progress through native XHR', async () => {
    window.location.href = 'http://127.0.0.1:5173/account'
    const fetched = vi
      .spyOn(window, 'fetch')
      .mockResolvedValue(Response.json({ etag: 'etag-1' }))
    const opened: [string, string][] = []
    const sent: Blob[] = []
    const seen: { credentials: boolean; headers: [string, string][] }[] = []
    class Upload {
      withCredentials = false
      readonly status = 200
      readonly responseText = '{"partNumber":1,"etag":"etag-1"}'
      readonly headers: [string, string][] = []
      readonly upload = new EventTarget()
      private load: () => void = () => {}
      open(method: string, url: string) {
        opened.push([method, url])
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
        this.upload.dispatchEvent(new ProgressEvent('progress', { loaded: 2 }))
        this.load()
      }
      abort() {}
    }
    vi.stubGlobal('XMLHttpRequest', Upload)
    const part = new File(['png'], 'overlap.png', { type: 'image/png' })
    const path = attachmentUploadPartPath(
      'org-one',
      { type: 'workspace', workspaceId: 'workspace-one' },
      'upload-1',
      1,
    )
    const progress: number[] = []
    const services = createLiveServices(
      window,
      window.location.origin,
      'same-origin',
    )
    await expect(
      services.api.sendPart(path, part, (body) => body, {
        progress: (sentBytes) => progress.push(sentBytes),
        signal: new AbortController().signal,
      }),
    ).resolves.toEqual({ partNumber: 1, etag: 'etag-1' })
    expect({ opened, seen, progress }).toEqual({
      opened: [['PUT', `http://127.0.0.1:5173${path}`]],
      seen: [
        {
          credentials: true,
          headers: [['Content-Type', 'application/octet-stream']],
        },
      ],
      progress: [2],
    })
    expect(sent).toHaveLength(1)
    expect(sent[0]).toBe(part)
    expect(fetched).not.toHaveBeenCalled()
  })
})
