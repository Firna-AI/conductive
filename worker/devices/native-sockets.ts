import { DEVICE_HEARTBEAT_MS } from '../../src/shared/device'
import type {
  WorkspaceSockets,
  NativeSocketAttachment,
} from '../native-sockets'
import type { DeviceBroker } from './broker'
import type { DeviceConnection } from './broker-types'
import {
  DeviceConnectionStore,
  type StoredDeviceConnection,
} from './connection-store'
import { deviceBrokerName } from './paths'
import { deviceFrame, deviceWire } from './socket'

export class DeviceSockets {
  private readonly store: DeviceConnectionStore
  private readonly connections = new WeakMap<WebSocket, DeviceConnection>()
  private readonly context: DurableObjectState
  private readonly sockets: WorkspaceSockets
  private readonly broker: DeviceBroker
  private readonly matches: (name: string) => boolean
  private readonly autoResponseAt: (socket: WebSocket) => number | null
  constructor(
    context: DurableObjectState,
    sockets: WorkspaceSockets,
    broker: DeviceBroker,
    matches: (name: string) => boolean,
    autoResponseAt: (socket: WebSocket) => number | null = (socket) =>
      context.getWebSocketAutoResponseTimestamp(socket)?.getTime() ?? null,
  ) {
    this.context = context
    this.sockets = sockets
    this.broker = broker
    this.matches = matches
    this.autoResponseAt = autoResponseAt
    this.store = new DeviceConnectionStore(context.storage)
    sockets.register('device', {
      restore: (socket, state) => this.restore(socket, state),
      message: async (socket, _state, value) => {
        const connection = this.connections.get(socket)
        if (!connection) return
        let frame: unknown
        try {
          frame = deviceFrame(value)
        } catch {
          await this.close(socket)
          return
        }
        await broker.receive(connection, frame)
        if (broker.connection === connection) await connection.persist?.()
      },
      close: (socket, state) => this.close(socket, state),
    })
  }

  async accept(
    socket: WebSocket,
    identity: Pick<
      StoredDeviceConnection,
      'device' | 'deviceName' | 'userId' | 'sessionId'
    >,
  ): Promise<void> {
    const record = await this.store.replace({
      ...identity,
      lastSeen: this.broker.now(),
      nextCheckAt: this.broker.now() + DEVICE_HEARTBEAT_MS,
    })
    this.sockets.accept(socket, {
      version: 1,
      role: 'device',
      id: record.device.connectionId,
      generation: record.generation,
    })
    this.configureHeartbeat()
    const connection = this.connection(socket, record)
    await this.broker.attach(connection)
  }

  private async restore(
    socket: WebSocket,
    state: NativeSocketAttachment,
  ): Promise<boolean> {
    const record = await this.store.read()
    if (
      !record ||
      record.generation !== state.generation ||
      record.device.connectionId !== state.id ||
      !this.matches(deviceBrokerName(record.userId))
    )
      return false
    this.configureHeartbeat()
    this.broker.connection = this.connection(socket, record)
    return true
  }

  private configureHeartbeat(): void {
    this.context.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair(
        '{"type":"device.ping"}',
        '{"type":"device.pong"}',
      ),
    )
  }

  private connection(
    socket: WebSocket,
    record: StoredDeviceConnection,
  ): DeviceConnection {
    const connection: DeviceConnection = {
      ...record,
      heartbeatAt: () => this.autoResponseAt(socket),
      persist: () =>
        this.store.save(
          {
            ...record,
            lastSeen: connection.lastSeen,
            nextCheckAt: connection.nextCheckAt ?? record.nextCheckAt,
          },
          record.generation,
        ),
      retire: () => this.store.save(null, record.generation),
      send: (message) => socket.send(deviceWire(message)),
      close: (code = 1000, reason = 'The Mac is not available.') =>
        socket.close(code, reason),
    }
    this.connections.set(socket, connection)
    return connection
  }

  private close(
    socket: WebSocket,
    state?: NativeSocketAttachment,
  ): Promise<void> {
    let connection = this.connections.get(socket)
    this.connections.delete(socket)
    return this.broker.serial(async () => {
      if (!connection && state && !this.broker.connection) {
        const record = await this.store.read()
        if (
          record?.generation === state.generation &&
          record.device.connectionId === state.id &&
          this.matches(deviceBrokerName(record.userId))
        ) {
          connection = this.connection(socket, record)
          this.connections.delete(socket)
          this.broker.connection = connection
        }
      }
      if (connection && this.broker.connection === connection)
        await this.broker.drop()
    })
  }
}
