import { isRecord } from '../http'
import { machineBusy } from './errors'

export type MachineSocket = Pick<
  WebSocket,
  | 'readyState'
  | 'send'
  | 'close'
  | 'serializeAttachment'
  | 'deserializeAttachment'
>

export interface SocketIdentity {
  generation: number
  ready: boolean
  lastId: number
}

export function socketIdentity(value: unknown): SocketIdentity | null {
  return isRecord(value) &&
    typeof value.generation === 'number' &&
    Number.isSafeInteger(value.generation) &&
    value.generation > 0 &&
    typeof value.ready === 'boolean' &&
    typeof value.lastId === 'number' &&
    Number.isInteger(value.lastId) &&
    value.lastId >= 0 &&
    value.lastId <= 0xffff_ffff
    ? { generation: value.generation, ready: value.ready, lastId: value.lastId }
    : null
}

export class SocketState {
  private readonly socket: MachineSocket
  private readonly state: SocketIdentity

  constructor(socket: MachineSocket, state: SocketIdentity) {
    this.socket = socket
    this.state = state
    this.save()
  }

  get ready(): boolean {
    return this.state.ready
  }

  welcomed(): void {
    this.state.ready = true
    this.save()
  }

  allocateId(): number {
    if (this.state.lastId === 0xffff_ffff) throw machineBusy()
    this.state.lastId++
    this.save()
    return this.state.lastId
  }

  wasAllocated(id: number): boolean {
    return id > 0 && id <= this.state.lastId
  }

  private save(): void {
    this.socket.serializeAttachment(this.state)
  }
}
