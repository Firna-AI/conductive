import { ProviderError } from '../sandbox/errors'
import type { ProxySocket, SocketRuntime, ToolDependencies } from './types'

const cloudflareSockets: SocketRuntime = {
  pair: () => {
    const pair = new WebSocketPair()
    return {
      server: pair[1],
      response: (headers) =>
        new Response(null, { status: 101, headers, webSocket: pair[0] }),
    }
  },
}

export interface BridgeOptions {
  headers: Headers
  authorize: () => Promise<void>
  fromBrowser?: (data: string | ArrayBuffer) => Promise<string | ArrayBuffer>
  onClose?: () => void
}

/** Queues in each direction preserve frame order across asynchronous authorization. */
export function bridgeSocket(
  upstream: Response,
  dependencies: ToolDependencies,
  options: BridgeOptions,
) {
  if (upstream.status !== 101 || !upstream.webSocket)
    throw new ProviderError('invalid_response', 502)
  const remote: ProxySocket = upstream.webSocket
  const runtime = dependencies.sockets ?? cloudflareSockets
  const pair = runtime.pair()
  let closed = false
  const close = (code = 1008) => {
    if (closed) return
    closed = true
    pair.server.close(code, 'Connection closed.')
    remote.close(code, 'Connection closed.')
    options.onClose?.()
  }
  const relay = (
    source: ProxySocket,
    destination: ProxySocket,
    browser: boolean,
  ) => {
    let queue = Promise.resolve()
    source.addEventListener('message', (event) => {
      queue = queue
        .then(async () => {
          if (closed) return
          await options.authorize()
          const data =
            browser && options.fromBrowser
              ? await options.fromBrowser(event.data)
              : event.data
          if (browser && options.fromBrowser) await options.authorize()
          if (!closed) destination.send(data)
        })
        .catch(() => close())
    })
    source.addEventListener('close', () => close(1000))
    source.addEventListener('error', () => close(1011))
  }
  relay(pair.server, remote, true)
  relay(remote, pair.server, false)
  remote.accept()
  pair.server.accept()
  return { response: pair.response(options.headers), close }
}
