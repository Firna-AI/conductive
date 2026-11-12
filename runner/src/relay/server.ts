import { createServer, type Server } from 'node:http'
import process from 'node:process'

import { PREVIEW_RELAY_PORT } from '../../../src/shared/previews'
import { sandboxAddresses } from './connect'
import { relayRequest } from './http'
import { relayUpgrade } from './upgrade'
import { ingressReader, type IngressReader } from './ingress'

export interface PreviewRelayOptions {
  port?: number
  targetAddresses?: readonly string[]
  ingressIdentity?: IngressReader
}

export function startPreviewRelay(options: PreviewRelayOptions = {}): Server {
  const port = options.port ?? PREVIEW_RELAY_PORT
  const addresses = () => options.targetAddresses ?? sandboxAddresses()
  const readIngress = options.ingressIdentity ?? ingressReader()
  const currentIngress = async () => {
    try {
      return await readIngress()
    } catch {
      return null
    }
  }
  const listenPort = () => {
    const address = server.address()
    return address && typeof address !== 'string' ? address.port : port
  }
  const server = createServer((request, response) => {
    void currentIngress().then((ingress) =>
      relayRequest(request, response, listenPort(), addresses(), ingress),
    )
  })
  server.requestTimeout = 0
  server.on('upgrade', (request, socket, head) => {
    void currentIngress().then((ingress) =>
      relayUpgrade(request, socket, head, listenPort(), addresses(), ingress),
    )
  })
  return process.env.LISTEN_FDS === '1' &&
    process.env.LISTEN_PID === String(process.pid)
    ? server.listen({ fd: 3 })
    : server.listen(port, '127.0.0.1')
}
