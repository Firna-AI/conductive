import { DurableObject } from 'cloudflare:workers'

import type { HostOperation } from '../../src/shared/generated/HostOperation'
import type { HostStreamPort } from '../../src/shared/generated/HostStreamPort'
import {
  HOST_CLOSE_REPLACED,
  HOST_CLOSE_TOKEN_CHANGED,
  HOST_CLOSE_UNSUPPORTED_VERSION,
  HOST_PROTOCOL_VERSION,
  HOST_PATH,
} from '../../src/shared/host'
import type { AppEnv } from '../env'
import { featureResult } from '../features/result'
import { errorResponse } from '../http'
import { hash } from '../security/crypto'
import {
  equalDigest,
  hostToken,
  machinesBinding,
  tokenRequired,
} from './authorization'
import { HostConnection, HostWelcomeWait } from './host-connection'
import { invalidRequest, machineHttpError, machineUnavailable } from './errors'
import { validateOperation } from './operations'
import {
  machineObjectName,
  readMachineRecord,
  readOwner,
  requireOwner,
  sameOwner,
  type MachineOwner,
  type MachineRecord,
} from './identity'
import { socketIdentity } from './socket-state'

export class Machine extends DurableObject<AppEnv> {
  private record: MachineRecord | null = null
  private host: HostConnection | null = null
  private readonly welcomeWait = new HostWelcomeWait()

  constructor(context: DurableObjectState, env: AppEnv) {
    super(context, env)
    context.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair('{"type":"ping"}', '{"type":"pong"}'),
    )
    context.blockConcurrencyWhile(async () => {
      this.record = readMachineRecord(
        await context.storage.get<unknown>('machine'),
      )
      for (const socket of context.getWebSockets()) {
        const state = socketIdentity(socket.deserializeAttachment())
        if (
          this.record?.digest &&
          state?.generation === this.record.generation &&
          socket.readyState === WebSocket.OPEN
        ) {
          this.close(HOST_CLOSE_REPLACED)
          this.host = new HostConnection(socket, state, context.storage.kv)
        } else
          socket.close(
            HOST_CLOSE_TOKEN_CHANGED,
            'The connection is no longer available.',
          )
      }
    })
  }

  issueToken(owner: MachineOwner, digest: string) {
    return this.ctx.blockConcurrencyWhile(() =>
      featureResult(async () => {
        this.checkIdentity(owner)
        if (!/^[A-Za-z0-9_-]{43}$/.test(digest)) throw invalidRequest()
        if (this.record?.digest === digest) return
        this.record = {
          owner,
          digest,
          generation: (this.record?.generation ?? 0) + 1,
          hello: this.record?.hello ?? null,
        }
        this.close(HOST_CLOSE_TOKEN_CHANGED)
        await this.ctx.storage.put('machine', this.record)
      }),
    )
  }
  revokeToken(owner: MachineOwner) {
    return this.ctx.blockConcurrencyWhile(() =>
      featureResult(async () => {
        this.checkIdentity(owner)
        if (!this.record || this.record.digest === null) return
        this.record = {
          owner,
          digest: null,
          generation: (this.record?.generation ?? 0) + 1,
          hello: this.record?.hello ?? null,
        }
        this.close(HOST_CLOSE_TOKEN_CHANGED)
        await this.ctx.storage.put('machine', this.record)
      }),
    )
  }
  connection(owner: MachineOwner) {
    return featureResult(async () => {
      requireOwner(this.record, owner)
      return {
        connected: this.host?.connected() ?? false,
        hello: this.record?.hello ?? null,
      }
    })
  }

  runCommand(owner: MachineOwner, command: string, timeoutSeconds: number) {
    return featureResult(async () => {
      const result = await this.request(owner, {
        kind: 'command.run',
        command,
        timeoutSeconds,
      })
      if (result.kind !== 'command.result')
        throw new Error('Unexpected command result.')
      return result
    })
  }
  startCommand(owner: MachineOwner, command: string) {
    return featureResult(async () => {
      const result = await this.request(owner, {
        kind: 'command.start',
        command,
      })
      if (result.kind !== 'command.started')
        throw new Error('Unexpected command start.')
      return result
    })
  }
  commandStatus(
    owner: MachineOwner,
    processId: number,
    stdoutOffset: number,
    stderrOffset: number,
    waitForHost = false,
  ) {
    return featureResult(async () => {
      const result = await this.request(
        owner,
        { kind: 'command.status', processId, stdoutOffset, stderrOffset },
        waitForHost,
      )
      if (result.kind !== 'command.status')
        throw new Error('Unexpected command status.')
      return result
    })
  }
  fileInfo(owner: MachineOwner, path: string) {
    return featureResult(async () => {
      const result = await this.request(owner, { kind: 'file.info', path })
      if (result.kind !== 'file.info') throw new Error('Unexpected file info.')
      return result
    })
  }
  readFile(owner: MachineOwner, path: string, maxBytes: number) {
    return featureResult(async () => {
      const result = await this.request(owner, {
        kind: 'file.read',
        path,
        maxBytes,
      })
      if (result.kind !== 'file.content' && result.kind !== 'file.too_large')
        throw new Error('Unexpected file content.')
      return result
    })
  }
  openStream(owner: MachineOwner, port: HostStreamPort) {
    return featureResult(async () => {
      requireOwner(this.record, owner)
      validateOperation({ kind: 'stream.open', streamId: 0, port })
      if (!this.host) throw machineUnavailable()
      return this.host.open(port)
    })
  }

  async fetch(request: Request): Promise<Response> {
    try {
      if (
        new URL(request.url).origin !== this.env.MACHINE_ORIGIN ||
        new URL(request.url).pathname !== HOST_PATH
      )
        throw machineHttpError(
          403,
          'machine_forbidden',
          'The connection is not available.',
        )
      const { token, objectId } = hostToken(request)
      const digest = await hash(token)
      return await this.ctx.blockConcurrencyWhile(async () => {
        if (
          objectId !== this.ctx.id.toString() ||
          !this.record?.digest ||
          !equalDigest(this.record.digest, digest)
        )
          return errorResponse(tokenRequired())
        this.close(HOST_CLOSE_REPLACED)
        const pair = new WebSocketPair()
        this.host = new HostConnection(
          pair[1],
          { generation: this.record.generation, ready: false, lastId: 0 },
          this.ctx.storage.kv,
        )
        this.ctx.acceptWebSocket(pair[1])
        return new Response(null, { status: 101, webSocket: pair[0] })
      })
    } catch (error) {
      return errorResponse(error, request)
    }
  }

  async webSocketMessage(
    socket: WebSocket,
    value: string | ArrayBuffer,
  ): Promise<void> {
    if (socket !== this.host?.socket) {
      socket.close(HOST_CLOSE_TOKEN_CHANGED)
      return
    }
    try {
      const message = this.host.receive(value)
      if (message?.type !== 'hello') return
      await this.ctx.blockConcurrencyWhile(async () => {
        if (!this.record || socket !== this.host?.socket) return
        this.record.hello = {
          hostProtocolVersion: message.hostProtocolVersion,
          programVersion: message.programVersion,
          at: Date.now(),
        }
        await this.ctx.storage.put('machine', this.record)
        if (message.hostProtocolVersion !== HOST_PROTOCOL_VERSION) {
          this.close(HOST_CLOSE_UNSUPPORTED_VERSION)
          return
        }
        this.host.send({
          type: 'welcome',
          hostProtocolVersion: HOST_PROTOCOL_VERSION,
        })
        this.host.welcomed()
        this.welcomeWait.welcomed()
      })
    } catch {
      this.close(1008)
    }
  }
  webSocketClose(socket: WebSocket): void {
    if (socket === this.host?.socket) this.close(1000)
  }
  webSocketError(socket: WebSocket): void {
    this.webSocketClose(socket)
  }

  private checkIdentity(owner: MachineOwner): void {
    if (
      !readOwner(owner) ||
      !machinesBinding(this.env)
        .idFromName(machineObjectName(owner))
        .equals(this.ctx.id) ||
      (this.record && !sameOwner(this.record.owner, owner))
    )
      throw machineHttpError(
        404,
        'machine_not_found',
        'The cloud computer is not available.',
      )
  }
  private async request(
    owner: MachineOwner,
    operation: HostOperation,
    waitForHost = false,
  ) {
    requireOwner(this.record, owner)
    validateOperation(operation)
    let deadline: number | undefined
    if (waitForHost) {
      deadline = await this.welcomeWait.deadline(
        this.host?.connected() ?? false,
      )
      requireOwner(this.record, owner)
    }
    if (!this.host) throw machineUnavailable()
    return this.host.request(operation, deadline)
  }
  private close(code: number): void {
    const host = this.host
    this.host = null
    host?.disconnect()
    if (host && host.socket.readyState !== WebSocket.CLOSED)
      host.socket.close(code, 'The connection is no longer available.')
  }
}
