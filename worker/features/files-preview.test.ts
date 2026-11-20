import type { WebSocket } from 'miniflare'
import { afterEach, beforeAll, expect, it } from 'vitest'

import { filesPreviewPath, PREVIEW_RELAY_PORT } from '../../src/shared/previews'
import { closeSockets, SocketInbox } from '../chat/adapter-sockets.test-support'
import { record } from '../chat/inputs'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { requestRunner } from '../chat/integration/runner-socket.test-support'
import { featureFixture, type FeatureFixture } from './fixture.test-support'

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

it('opens files previews only for a connected capable runner and keeps its capability after hibernation', async () => {
  const active = (fixture = await featureFixture(bundle, {
    outbound: async (request, fallback) => {
      const path = new URL(request.url).pathname
      if (path.endsWith('/host'))
        return Response.json({
          ok: true,
          type: 'port.hosted',
          port: PREVIEW_RELAY_PORT,
          url: `https://relay-${PREVIEW_RELAY_PORT}.on.boat.dev?_token=preview-port-token`,
          access: 'private',
          isProtected: true,
        })
      if (
        path.endsWith('/commands') &&
        record(await request.clone().json()).command ===
          'systemctl is-active --quiet conductive-preview-relay.socket'
      )
        return Response.json({
          ok: true,
          type: 'command.finished',
          exitCode: 0,
          stdout: '',
          stderr: '',
          timedOut: false,
        })
      return fallback(request)
    },
  }))
  await active.env.DB.prepare(
    "UPDATE workspaces SET sandbox_id = 'bx_files' WHERE id = ?",
  )
    .bind(OUTER_WORKSPACE)
    .run()
  const open = () =>
    active.request(filesPreviewPath(OUTER_ORG, OUTER_WORKSPACE), {
      method: 'POST',
      body: '{}',
    })
  expect((await open()).status).toBe(409)
  const connect = async (fileServer?: true) => {
    const response = await requestRunner(active)
    expect(response.status).toBe(101)
    const socket = response.webSocket
    if (!socket) throw new Error('The runner socket is missing.')
    sockets.push(socket)
    const inbox = new SocketInbox(socket)
    socket.accept()
    socket.send(
      JSON.stringify({
        type: 'hello',
        workspaceId: OUTER_WORKSPACE,
        protocolVersion: 2,
        streamId: 'files-runner',
        ...(fileServer ? { fileServer } : {}),
      }),
    )
    expect(await inbox.next()).toMatchObject({ type: 'welcome' })
    return socket
  }
  await connect()
  expect((await open()).status).toBe(409)
  const runner = await connect(true)
  const created = await open()
  expect(created.status).toBe(201)
  const preview: unknown = await created.json()
  const wake = await active.hibernate()
  expect(wake.after.instance).not.toBe(wake.before.instance)
  const reused = await open()
  expect(reused.status).toBe(200)
  expect(await reused.json()).toEqual(preview)
  await closeSockets(runner)
  const unavailable = await open()
  expect(unavailable.status).toBe(409)
  expect(await unavailable.json()).toMatchObject({
    error: { code: 'file_server_unavailable' },
  })
})
