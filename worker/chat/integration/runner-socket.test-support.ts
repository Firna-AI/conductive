import { WebSocket } from 'miniflare'

import { MACHINE_PATHS } from '../../../src/shared/agent-tools'
import {
  RUNNER_PROTOCOL_VERSION,
  type RunnerEvent,
  type RunnerToWorkspace,
} from '../../../src/shared/runner'
import { SocketInbox } from '../adapter-sockets.test-support'
import {
  OUTER_MACHINE_ORIGIN,
  type OuterRuntime,
} from './outer-runtime.test-support'
import { OUTER_TOKEN, OUTER_WORKSPACE } from './outer-seed.test-support'

export function requestRunner(
  fixture: OuterRuntime,
  token: string | null = OUTER_TOKEN,
) {
  return fixture.runtime.dispatchFetch(
    `${OUTER_MACHINE_ORIGIN}${MACHINE_PATHS.runner}`,
    {
      headers: {
        Upgrade: 'websocket',
        ...(token === null ? {} : { Authorization: `Bearer ${token}` }),
      },
    },
  )
}

export class OuterFakeRunner {
  readonly socket: WebSocket
  readonly inbox: SocketInbox
  readonly received: unknown[] = []
  readonly closed: Promise<{ code: number; reason: string }>
  private eventNumber = 0
  private readonly streamId = 'outer-runner-stream'

  constructor(socket: WebSocket, workspaceId = OUTER_WORKSPACE) {
    this.socket = socket
    this.inbox = new SocketInbox(socket)
    socket.addEventListener('message', (event) => {
      if (typeof event.data !== 'string')
        throw new Error('Expected a text socket message.')
      const message: unknown = JSON.parse(event.data)
      this.received.push(message)
    })
    this.closed = new Promise((resolve) => {
      socket.addEventListener(
        'close',
        (event) => {
          if (socket.readyState === WebSocket.READY_STATE_CLOSING)
            socket.close(1000, 'Connection closed.')
          resolve({ code: event.code, reason: event.reason })
        },
        { once: true },
      )
    })
    socket.accept()
    this.send({
      type: 'hello',
      protocolVersion: RUNNER_PROTOCOL_VERSION,
      workspaceId,
      streamId: this.streamId,
    })
  }

  emit(event: RunnerEvent): void {
    this.send({
      type: 'event',
      streamId: this.streamId,
      eventNumber: ++this.eventNumber,
      occurredAt: 1_800_000_000_000 + this.eventNumber,
      event,
    })
  }

  private send(message: RunnerToWorkspace): void {
    this.socket.send(JSON.stringify(message))
  }
}
