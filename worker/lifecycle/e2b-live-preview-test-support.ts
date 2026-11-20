import { once } from 'node:events'

import { onTestFinished } from 'vitest'
import WebSocket, { WebSocketServer } from 'ws'

import type { E2bLiveSandbox } from '../../image/e2b/live-provider'
import {
  E2B_PRIVATE_HEADER_NAMES,
  E2B_PRIVATE_HEADERS,
} from '../../src/shared/preview-ingress'
import {
  PREVIEW_RELAY_PORT,
  PREVIEW_RELAY_PORT_HEADER,
} from '../../src/shared/previews'

const unused = async (): Promise<never> => {
  throw new Error('Unexpected live provider operation.')
}

export async function livePreviewFixture() {
  const sandboxId = 'sandbox-one'
  const domain = 'eu.e2b.test'
  const outerPort = 41235
  const credential = 'live-probe-traffic-token'
  const websocket = new WebSocketServer({ host: '127.0.0.1', port: 0 })
  websocket.on('connection', (socket) => {
    socket.on('message', (bytes, binary) => socket.send(bytes, { binary }))
  })
  onTestFinished(async () => {
    for (const client of websocket.clients) client.terminate()
    await new Promise<void>((done) => websocket.close(() => done()))
  })
  await once(websocket, 'listening')
  const address = websocket.address()
  if (!address || typeof address === 'string')
    throw new Error('Missing local socket port.')
  const ports = JSON.stringify({ ipv4: 41001, ipv6: 41002, network: 41003 })
  const provider: E2bLiveSandbox = {
    create: unused,
    get: unused,
    stop: unused,
    resume: unused,
    fork: unused,
    delete: unused,
    setAutoStop: unused,
    saveSnapshot: unused,
    getSnapshot: unused,
    deleteSnapshot: unused,
    desktop: unused,
    fileInfo: unused,
    getCommandStatus: unused,
    runCommand: async () => ({
      exitCode: 0,
      stdout: '',
      stderr: '',
      timedOut: false,
    }),
    writeFile: async (_id, _path, body) => {
      await new Response(body).arrayBuffer()
    },
    startCommand: async () => ({ processId: 1 }),
    readFile: async (_id, path) => ({
      kind: 'file',
      file: {
        path,
        content: ports,
        encoding: 'utf-8',
        sizeBytes: new TextEncoder().encode(ports).byteLength,
      },
    }),
    privatePort: async (_id, port, mode) => ({
      origin: `https://${mode === 'localhost' && port === PREVIEW_RELAY_PORT ? outerPort : port}-${sandboxId}.${domain}`,
      credential: {
        headers: { [E2B_PRIVATE_HEADER_NAMES.trafficToken]: credential },
        stripHeaders: E2B_PRIVATE_HEADERS,
        stripCookies: [],
        stripQueryParameters: [],
      },
    }),
  }
  const sent: {
    protocol: 'http' | 'websocket'
    headers: Headers
    port: number
  }[] = []
  return {
    provider,
    sandboxId,
    outerPort,
    sent,
    requests: {
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(
          input instanceof Request ? input.url : String(input),
        )
        const headers = new Headers(init?.headers)
        if (headers.get(E2B_PRIVATE_HEADER_NAMES.trafficToken) !== credential)
          return new Response(null, { status: 403 })
        sent.push({
          protocol: 'http',
          headers: new Headers(headers),
          port: Number(url.hostname.split('-', 1)[0]),
        })
        return Response.json(
          {
            marker: 'conductive-e2b-probe',
            host: `localhost:${headers.get(PREVIEW_RELAY_PORT_HEADER)}`,
            clean: true,
          },
          { headers: { 'X-Conductive-Relay': '1' } },
        )
      },
      websocket: (url: URL, headers: Headers) => {
        sent.push({
          protocol: 'websocket',
          headers: new Headers(headers),
          port: Number(url.hostname.split('-', 1)[0]),
        })
        return new WebSocket(`ws://127.0.0.1:${address.port}`)
      },
    },
  }
}
