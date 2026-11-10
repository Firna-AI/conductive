import { createServer, type Server } from 'node:http'

import { PREVIEW_RELAY_PORT } from '../../../src/shared/previews'
import { sandboxAddresses } from './connect'
import { relayRequest } from './http'
import { relayUpgrade } from './upgrade'

export interface PreviewRelayOptions {
  port?: number
  targetAddresses?: readonly string[]
}

export function startPreviewRelay(options: PreviewRelayOptions = {}): Server {
  const port = options.port ?? PREVIEW_RELAY_PORT
  const addresses = () => options.targetAddresses ?? sandboxAddresses()
  const listenPort = () => {
    const address = server.address()
    return address && typeof address !== 'string' ? address.port : port
  }
  const server = createServer((request, response) => {
    void relayRequest(request, response, listenPort(), addresses())
  })
  server.requestTimeout = 0
  server.on('upgrade', (request, socket, head) => {
    void relayUpgrade(request, socket, head, listenPort(), addresses())
  })
  return server.listen(port, '127.0.0.1')
}
