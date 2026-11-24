import { HostConnection } from './host-connection'
import { socketIdentity, type MachineSocket } from './socket-state'
import type { StreamCloseStorage } from './stream-close'

export function hostConnectionFixture() {
  const sent: unknown[] = []
  let attachment: unknown = { generation: 1, ready: true, lastId: 0 }
  const records = new Map<string, boolean>()
  const storage: StreamCloseStorage = {
    get: (key) => records.get(key),
    put(key, value) {
      records.set(key, value)
    },
    delete: (key) => records.delete(key),
    *list({ prefix, limit }) {
      let count = 0
      for (const entry of records) {
        if (!entry[0].startsWith(prefix)) continue
        yield entry
        if (++count === limit) return
      }
    },
  }
  const socket: MachineSocket = {
    readyState: WebSocket.OPEN,
    send(value: unknown) {
      if (typeof value !== 'string') throw new Error('Expected JSON.')
      sent.push(JSON.parse(value))
    },
    close() {},
    serializeAttachment(value: unknown) {
      attachment = structuredClone(value)
    },
    deserializeAttachment: () => structuredClone(attachment),
  }
  return {
    sent,
    connection: () => {
      const identity = socketIdentity(socket.deserializeAttachment())
      if (!identity) throw new Error('Missing socket identity.')
      return new HostConnection(socket, identity, storage)
    },
  }
}
