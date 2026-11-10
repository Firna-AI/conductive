import { once } from 'node:events'
import {
  createServer,
  request,
  type IncomingMessage,
  type RequestListener,
  type RequestOptions,
  type Server,
} from 'node:http'
import type { Socket } from 'node:net'

import { onTestFinished } from 'vitest'

import { startPreviewRelay, type PreviewRelayOptions } from './server'

function ownServer(server: Server) {
  const sockets = new Set<Socket>()
  server.on('connection', (socket) => {
    sockets.add(socket)
    socket.once('close', () => sockets.delete(socket))
  })
  onTestFinished(async () => {
    for (const socket of sockets) socket.destroy()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })
}

function serverPort(server: Server): number {
  const address = server.address()
  if (!address || typeof address === 'string')
    throw new Error('The test server has no port.')
  return address.port
}

export async function localServer(
  listener: RequestListener,
  host = '127.0.0.1',
) {
  const server = createServer(listener)
  ownServer(server)
  server.listen(0, host)
  await once(server, 'listening')
  return { server, port: serverPort(server) }
}

export async function relayFixture(options: PreviewRelayOptions = {}) {
  const server = startPreviewRelay({ port: 0, ...options })
  ownServer(server)
  await once(server, 'listening')
  const port = serverPort(server)
  const headers = (target: number) => ({
    Host: `sandbox-${port}.on.boat.dev`,
    'X-Conductive-Preview-Port': String(target),
  })
  return {
    server,
    port,
    headers,
    send: async (options: RequestOptions = {}, body = '') => {
      const client = request({ host: '127.0.0.1', port, ...options })
      const response = new Promise<IncomingMessage>((resolve, reject) => {
        client.once('response', resolve)
        client.once('error', reject)
      })
      client.end(body)
      const incoming = await response
      return {
        status: incoming.statusCode,
        headers: incoming.headers,
        body: await readBody(incoming),
      }
    },
  }
}

export async function readBody(incoming: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of incoming) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8')
}
