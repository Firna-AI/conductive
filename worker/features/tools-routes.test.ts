import type { WebSocket } from 'miniflare'
import { afterEach, beforeAll, expect, it } from 'vitest'

import { desktopPath } from '../../src/shared/desktop'
import { previewsPath } from '../../src/shared/previews'
import { terminalPaths } from '../../src/shared/terminal'
import { workspaceEventsPath } from '../../src/shared/events'
import { number, record, string } from '../chat/inputs'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { cacheTerminalPassword } from '../terminal/credentials'
import { featureFixture, type FeatureFixture } from './fixture.test-support'
import { closeSockets, SocketInbox } from '../chat/adapter-sockets.test-support'

let bundle: string
let fixture: FeatureFixture | undefined
const sockets: WebSocket[] = []
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
afterEach(async () => {
  await closeSockets(...sockets)
  sockets.length = 0
  await fixture?.dispose()
})

it('serves terminal and fresh desktop URLs and launches a preview through its separate domain', async () => {
  let desktop = 0
  const upstream: Request[] = []
  const active = (fixture = await featureFixture(bundle, {
    outbound: async (request, fallback) => {
      const url = new URL(request.url)
      if (url.hostname.endsWith('.on.boat.dev')) {
        upstream.push(request)
        return new Response('private preview', {
          headers: { 'Content-Type': 'text/plain' },
        })
      }
      if (url.pathname.endsWith('/host')) {
        const port = number(record(await request.clone().json()).port)
        return Response.json({
          ok: true,
          type: 'port.hosted',
          port,
          url: `https://sandbox-${port}.on.boat.dev?_token=server-port-token`,
          access: 'private',
          isProtected: true,
        })
      }
      if (
        url.pathname.endsWith('/commands') &&
        record(await request.clone().json()).command ===
          'systemctl is-active --quiet conductive-preview-relay.service'
      )
        return Response.json({
          ok: true,
          type: 'command.finished',
          exitCode: 0,
          stdout: '',
          stderr: '',
          timedOut: false,
        })
      if (url.pathname.endsWith('/desktop'))
        return Response.json({
          ok: true,
          type: 'desktop.url',
          desktopUrl: `https://desktop.on.boat.dev/stream#token=desktop-${++desktop}`,
        })
      return fallback(request)
    },
  }))
  await active.env.DB.prepare(
    "UPDATE workspaces SET sandbox_id = 'bx_tools' WHERE id = ?",
  )
    .bind(OUTER_WORKSPACE)
    .run()
  await cacheTerminalPassword(
    active.env,
    {
      orgId: OUTER_ORG,
      workspaceId: OUTER_WORKSPACE,
      sandboxId: 'bx_tools',
      state: 'ready',
    },
    'a'.repeat(64),
    1,
  )
  const terminal = await active.request(
    terminalPaths.connection(OUTER_ORG, OUTER_WORKSPACE),
  )
  expect(terminal.status).toBe(200)
  expect(await terminal.json()).toEqual({
    state: 'ready',
    protocol: 'tty',
    socketPath: terminalPaths.socket(OUTER_ORG, OUTER_WORKSPACE),
  })
  const first = await active.request(desktopPath(OUTER_ORG, OUTER_WORKSPACE))
  expect(first.status).toBe(200)
  expect(await first.json()).toMatchObject({
    url: 'https://desktop.on.boat.dev/stream#token=desktop-1',
  })
  expect(
    await (
      await active.request(desktopPath(OUTER_ORG, OUTER_WORKSPACE))
    ).json(),
  ).toMatchObject({ url: 'https://desktop.on.boat.dev/stream#token=desktop-2' })
  const opened = await active.request(
    previewsPath(OUTER_ORG, OUTER_WORKSPACE),
    { method: 'POST', body: JSON.stringify({ port: 3000 }) },
  )
  expect(opened.status).toBe(201)
  const preview = record(record(await opened.json()).preview)
  const launch = await active.request(new URL(string(preview.url)).pathname, {
    headers: { Accept: 'application/json' },
  })
  expect(launch.status).toBe(200)
  const address = new URL(string(record(await launch.json()).url))
  const fragment = new URLSearchParams(address.hash.slice(1))
  address.hash = ''
  address.searchParams.set('hostname', fragment.get('hostname') ?? '')
  const authorized = await active.runtime.dispatchFetch(address.href, {
    method: 'POST',
    headers: {
      Origin: address.origin,
      Authorization: `Bearer ${fragment.get('grant')}`,
    },
  })
  expect(authorized.status).toBe(200)
  const cookie = authorized.headers.get('Set-Cookie')?.split(';')[0]
  if (!cookie) throw new Error('Missing preview credential')
  const target = string(record(await authorized.json()).url)
  const response = await active.runtime.dispatchFetch(target, {
    headers: { Cookie: `${cookie}; ${active.cookies.ownerCookie}` },
  })
  expect(response.status).toBe(200)
  expect(await response.text()).toBe('private preview')
  expect(upstream.map((request) => request.headers.get('Cookie'))).toEqual([
    '_port_auth=server-port-token',
  ])
  await active.actor().waitForActivity()
  expect(
    await active.env.DB.prepare(
      'SELECT last_activity_at AS activity FROM workspaces WHERE id = ?',
    )
      .bind(OUTER_WORKSPACE)
      .first('activity'),
  ).not.toBe(1)
  const tabs: SocketInbox[] = []
  for (let index = 0; index < 2; index++) {
    const tab = await active.request(
      workspaceEventsPath(OUTER_ORG, OUTER_WORKSPACE),
      { headers: { Upgrade: 'websocket' } },
    )
    if (!tab.webSocket) throw new Error('Missing workspace socket')
    sockets.push(tab.webSocket)
    const inbox = new SocketInbox(tab.webSocket)
    tab.webSocket.accept()
    await inbox.next()
    tabs.push(inbox)
  }
  const closed = await active.request(new URL(string(preview.url)).pathname, {
    method: 'DELETE',
    body: '{}',
  })
  expect(closed.status).toBe(204)
  for (const inbox of tabs)
    expect(await inbox.next()).toMatchObject({
      type: 'event',
      envelope: {
        eventNumber: 1,
        event: { type: 'preview.revoked', previewId: preview.id },
      },
    })
  expect(
    (
      await active.runtime.dispatchFetch(target, {
        headers: { Cookie: cookie },
      })
    ).status,
  ).toBe(404)
})
