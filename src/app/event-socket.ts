import { workspaceEventsPath } from '../shared/events'
import type { WorkspaceEventSource } from './events'

/** The socket address of a path of the Worker at `origin`. */
function socketUrl(path: string, origin: string): URL {
  const url = new URL(path, origin)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url
}

/**
 * The sockets of the Worker at `origin`: the event socket of a workspace,
 * and its terminal. The Mac app gives the origin of its Worker, so both
 * reach the same Worker as its API.
 */
export function socketEventSource(origin: string): WorkspaceEventSource {
  return {
    openSocket: (path, protocol) =>
      new WebSocket(socketUrl(path, origin), protocol),
    open(target, handlers) {
      const path = workspaceEventsPath(
        target.orgId,
        target.workspaceId,
        target.afterEventNumber,
      )
      const socket = new WebSocket(socketUrl(path, origin))
      const onMessage = (event: MessageEvent) => {
        if (typeof event.data !== 'string') return
        let value: unknown
        try {
          value = JSON.parse(event.data)
        } catch {
          return
        }
        handlers.message(value)
      }
      socket.addEventListener('message', onMessage)
      socket.addEventListener('close', handlers.closed)
      return () => {
        socket.removeEventListener('message', onMessage)
        socket.removeEventListener('close', handlers.closed)
        socket.close()
      }
    },
  }
}
