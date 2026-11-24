import type { HostErrorCode } from '../../src/shared/generated/HostErrorCode'
import type { HostResult } from '../../src/shared/generated/HostResult'
import type { HostToWorker } from '../../src/shared/generated/HostToWorker'
import {
  HOST_MESSAGE_PART_BYTES,
  HOST_PATH,
  HOST_PROTOCOL_VERSION,
} from '../../src/shared/host'
import { encodeHostFrame } from '../../src/shared/host-frames'
import { number, record, string } from '../chat/inputs'
import type { AppEnv } from '../env'
import { isRecord } from '../http'
import {
  hostToken,
  MACHINE_TOKEN_PATTERN,
  machinesBinding,
} from '../machines/authorization'
import { HostInbox } from '../machines/host-inbox.test-support'
import { issueMachineToken, workspaceMachineOwner } from '../machines/client'
import type { LifecycleBoat } from './lifecycle-boat-test-support'

type HostCommandRequest = LifecycleBoat['commandRequests'][number]
type HostStatusRequest = LifecycleBoat['statusRequests'][number]

interface HostCommandScenario {
  command(request: HostCommandRequest): Promise<HostResult>
  status(request: HostStatusRequest): Promise<HostResult>
}

interface HostComputer {
  token: string
  connection?: {
    socket: WebSocket
    closed: Promise<void>
  }
}

const encoder = new TextEncoder()
const machineToken = new RegExp(`^${MACHINE_TOKEN_PATTERN}$`)

export class LostHostReply extends Error {}

export class LifecycleHost {
  readonly commands: string[] = []
  readonly commandRequests: LifecycleBoat['commandRequests'] = []
  readonly statusRequests: LifecycleBoat['statusRequests'] = []
  autoConnect = true
  statusError?: HostErrorCode
  statusReply?: (request: HostStatusRequest, reply: HostResult) => HostResult
  private readonly computers = new Map<string, HostComputer>()
  private readonly env: AppEnv
  private readonly scenario: HostCommandScenario

  constructor(env: AppEnv, scenario: HostCommandScenario) {
    this.env = env
    this.scenario = scenario
  }

  async seed(
    orgId: string,
    workspaceId: string,
    sandboxId: string,
  ): Promise<void> {
    await this.computerStarted(sandboxId, {
      CONDUCTIVE_MACHINE_TOKEN: await issueMachineToken(
        this.env,
        workspaceMachineOwner(orgId, workspaceId),
      ),
    })
  }

  computerStarted = async (sandboxId: string, env: unknown): Promise<void> => {
    if (!isRecord(env) || typeof env.CONDUCTIVE_MACHINE_TOKEN !== 'string')
      return
    const token = env.CONDUCTIVE_MACHINE_TOKEN
    if (!machineToken.test(token)) return
    if (this.computers.get(sandboxId)?.token === token) return
    this.computers.set(sandboxId, { token })
    if (this.autoConnect) await this.connect(sandboxId)
  }

  async connect(sandboxId: string): Promise<void> {
    const computer = this.computers.get(sandboxId)
    if (!computer) throw new Error('The test computer has no machine token.')
    if (computer.connection?.socket.readyState === WebSocket.OPEN) return
    const request = new Request(`${this.env.MACHINE_ORIGIN}${HOST_PATH}`, {
      headers: {
        Upgrade: 'websocket',
        Authorization: `Bearer ${computer.token}`,
      },
    })
    const machines = machinesBinding(this.env)
    const id = machines.idFromString(hostToken(request).objectId)
    const response = await machines.get(id).fetch(request)
    const socket = response.webSocket
    if (!socket) throw new Error(`Host upgrade returned ${response.status}.`)
    const inbox = new HostInbox(socket)
    const closed = new Promise<void>((resolve) => {
      socket.addEventListener(
        'close',
        () => {
          if (socket.readyState !== WebSocket.CLOSED) socket.close()
          resolve()
        },
        { once: true },
      )
    })
    computer.connection = { socket, closed }
    socket.accept()
    const hello: HostToWorker = {
      type: 'hello',
      hostProtocolVersion: HOST_PROTOCOL_VERSION,
      programVersion: 'test-release',
    }
    socket.send(JSON.stringify(hello))
    const welcome = await Promise.race([inbox.next(), closed])
    if (record(welcome).type !== 'welcome')
      throw new Error('Expected the test host welcome.')
    void this.serve(sandboxId, socket, inbox, closed)
  }

  async disconnect(sandboxId: string): Promise<void> {
    const connection = this.computers.get(sandboxId)?.connection
    if (!connection) return
    if (connection.socket.readyState === WebSocket.OPEN)
      connection.socket.close(1000, 'The test host disconnected.')
    await connection.closed
  }

  async close(): Promise<void> {
    await Promise.all(
      [...this.computers.keys()].map((id) => this.disconnect(id)),
    )
  }

  private async serve(
    sandboxId: string,
    socket: WebSocket,
    inbox: HostInbox,
    closed: Promise<void>,
  ): Promise<void> {
    for (;;) {
      const request = await Promise.race([inbox.request(), closed])
      if (!request) return
      void this.reply(sandboxId, socket, request)
    }
  }

  private async reply(
    sandboxId: string,
    socket: WebSocket,
    { requestId, operation }: Awaited<ReturnType<HostInbox['request']>>,
  ): Promise<void> {
    try {
      const result = await this.perform(sandboxId, operation)
      if (socket.readyState === WebSocket.OPEN)
        sendReply(socket, { type: 'reply', requestId, result })
    } catch (error) {
      if (!(error instanceof LostHostReply)) throw error
      if (socket.readyState === WebSocket.OPEN)
        socket.close(1000, 'The test host lost the reply.')
    }
  }

  private async perform(
    sandboxId: string,
    operation: Record<string, unknown>,
  ): Promise<HostResult> {
    if (
      operation.kind === 'command.run' ||
      operation.kind === 'command.start'
    ) {
      const request = {
        sandboxId,
        command: string(operation.command),
        detached: operation.kind === 'command.start',
      }
      this.commands.push(request.command)
      this.commandRequests.push(request)
      return this.scenario.command(request)
    }
    if (operation.kind === 'command.status') {
      const request = {
        processId: number(operation.processId),
        stdoutOffset: number(operation.stdoutOffset),
        stderrOffset: number(operation.stderrOffset),
      }
      const status = await this.scenario.status(request)
      this.statusRequests.push(request)
      return this.statusError
        ? { kind: 'error', code: this.statusError }
        : (this.statusReply?.(request, status) ?? status)
    }
    throw new Error('Unexpected test host operation.')
  }
}

function sendReply(
  socket: WebSocket,
  reply: Extract<HostToWorker, { type: 'reply' }>,
): void {
  const text = JSON.stringify(reply)
  const bytes = encoder.encode(text)
  if (bytes.byteLength <= HOST_MESSAGE_PART_BYTES) {
    socket.send(text)
    return
  }
  for (
    let offset = 0;
    offset < bytes.byteLength;
    offset += HOST_MESSAGE_PART_BYTES
  )
    socket.send(
      new Uint8Array(
        encodeHostFrame({
          kind: 'messagePart',
          requestId: reply.requestId,
          last: offset + HOST_MESSAGE_PART_BYTES >= bytes.byteLength,
          data: bytes.subarray(offset, offset + HOST_MESSAGE_PART_BYTES),
        }),
      ),
    )
}
