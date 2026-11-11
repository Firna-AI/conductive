import { isRecord } from '../http'
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

interface Endpoint {
  socket: ProxySocket
  peerClosed: boolean
}

type QueuedFrame =
  | { type: 'data'; data: string | ArrayBuffer }
  | { type: 'close'; code: number; reason: string }

function wireCloseCode(code: number): number {
  if (code === 1006) return 1011
  return (code >= 1000 && code <= 1014 && ![1004, 1005].includes(code)) ||
    (code >= 3000 && code <= 4999)
    ? code
    : 1000
}

/** Normal close follows its direction's accepted data. Cancellation aborts both queues. */
export function bridgeSocket(
  upstream: Response,
  dependencies: ToolDependencies,
  options: BridgeOptions,
) {
  if (upstream.status !== 101 || !upstream.webSocket)
    throw new ProviderError('invalid_response', 502)
  const remote: ProxySocket = upstream.webSocket
  const authorize = () =>
    dependencies.reporting
      ? dependencies.reporting.checked(
          'preview_authorization_failed',
          options.authorize,
        )
      : options.authorize()
  const fromBrowser = options.fromBrowser
  const transform = (data: string | ArrayBuffer) =>
    fromBrowser
      ? dependencies.reporting
        ? dependencies.reporting.checked('background_task_failed', () =>
            fromBrowser(data),
          )
        : fromBrowser(data)
      : Promise.resolve(data)
  const pair = (dependencies.sockets ?? cloudflareSockets).pair()
  const browser: Endpoint = { socket: pair.server, peerClosed: false }
  const sandbox: Endpoint = { socket: remote, peerClosed: false }
  let ended = false
  const finish = () => {
    if (ended) return
    ended = true
    options.onClose?.()
  }
  const close = (code = 1008) => {
    if (ended) return
    ended = true
    pair.server.close(code, 'Connection closed.')
    remote.close(code, 'Connection closed.')
    options.onClose?.()
  }
  const relay = (
    source: Endpoint,
    destination: Endpoint,
    fromBrowser: boolean,
  ) => {
    let pending: QueuedFrame[] = []
    let running = false
    const drain = async () => {
      try {
        while (pending.length && !ended) {
          const batch = pending
          pending = []
          const data = batch.filter((frame) => frame.type === 'data')
          if (data.length && !destination.peerClosed) {
            await authorize()
            const output: (string | ArrayBuffer)[] = []
            for (const frame of data)
              output.push(
                fromBrowser && options.fromBrowser
                  ? await transform(frame.data)
                  : frame.data,
              )
            if (fromBrowser && options.fromBrowser) await authorize()
            if (!ended && !destination.peerClosed)
              for (const value of output) destination.socket.send(value)
          }
          const ending = batch.find((frame) => frame.type === 'close')
          if (ending && !ended) {
            if (!destination.peerClosed)
              destination.socket.close(
                wireCloseCode(ending.code),
                ending.reason,
              )
            finish()
          }
        }
      } catch {
        close()
      } finally {
        running = false
      }
    }
    const enqueue = (frame: QueuedFrame) => {
      pending.push(frame)
      if (!running) {
        running = true
        queueMicrotask(() => {
          void drain()
        })
      }
    }
    source.socket.addEventListener('message', (event) => {
      if (ended || source.peerClosed || destination.peerClosed) return
      if (
        !isRecord(event) ||
        !(typeof event.data === 'string' || event.data instanceof ArrayBuffer)
      ) {
        close(1011)
        return
      }
      enqueue({ type: 'data', data: event.data })
    })
    source.socket.addEventListener('close', (event) => {
      if (ended || source.peerClosed) return
      source.peerClosed = true
      enqueue({
        type: 'close',
        code:
          isRecord(event) && typeof event.code === 'number' ? event.code : 1005,
        reason:
          isRecord(event) && typeof event.reason === 'string'
            ? event.reason
            : '',
      })
    })
    source.socket.addEventListener('error', () => close(1011))
  }
  relay(browser, sandbox, true)
  relay(sandbox, browser, false)
  remote.binaryType = 'arraybuffer'
  pair.server.binaryType = 'arraybuffer'
  remote.accept()
  pair.server.accept()
  return { response: pair.response(options.headers), close }
}
