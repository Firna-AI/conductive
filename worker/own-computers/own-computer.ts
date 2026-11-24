import { DurableObject } from 'cloudflare:workers'

import {
  COMPUTER_CLOSE_REPLACED,
  COMPUTER_CLOSE_REVOKED,
  COMPUTER_CLOSE_UNSUPPORTED_VERSION,
  COMPUTER_PATH,
} from '../../src/shared/computer'
import type { ComputerOperation } from '../../src/shared/generated/ComputerOperation'
import type { AppEnv } from '../env'
import { featureResult } from '../features/result'
import { errorResponse, HttpError } from '../http'
import { hash } from '../security/crypto'
import { computerWebSocketToken, credentialRequired } from './authorization'
import { ComputerChannel } from './channel'
import {
  findComputerByToken,
  readComputerAccess,
  recordComputerDisconnect,
  recordComputerHello,
} from './connection-data'
import { computerOffline } from './errors'
import {
  computerNamespace,
  computerNotFound,
  computerObjectId,
  sameComputer,
  type ComputerOwner,
} from './identity'
import { readComputerOperation } from './operations'
import { readComputerSocketState } from './socket-state'

export class OwnComputer extends DurableObject<AppEnv> {
  private channel: ComputerChannel | null = null

  constructor(context: DurableObjectState, env: AppEnv) {
    super(context, env)
    context.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair('{"type":"ping"}', '{"type":"pong"}'),
    )
    for (const socket of context.getWebSockets()) {
      const state = readComputerSocketState(socket.deserializeAttachment())
      if (
        state &&
        this.namesThisObject(state) &&
        socket.readyState === WebSocket.OPEN
      ) {
        if (this.channel) this.close(this.channel, COMPUTER_CLOSE_REPLACED)
        this.channel = new ComputerChannel(socket, state)
      } else if (socket.readyState === WebSocket.OPEN)
        socket.close(COMPUTER_CLOSE_REVOKED)
    }
  }

  connection(owner: ComputerOwner) {
    return featureResult(async () => {
      const access = await this.checkOwner(owner, false)
      const channel = this.channel
      return {
        connected:
          !!channel &&
          access.tokenDigest === channel.identity.digest &&
          channel.connected(),
      }
    })
  }

  closeRemoved(owner: ComputerOwner) {
    return this.ctx.blockConcurrencyWhile(() =>
      featureResult(async () => {
        await this.checkOwner(owner, true)
        if (this.channel) this.close(this.channel, COMPUTER_CLOSE_REVOKED)
      }),
    )
  }

  operate(owner: ComputerOwner, input: ComputerOperation) {
    return featureResult(async () => {
      const access = await this.checkOwner(owner, false)
      const operation = readComputerOperation(input)
      const channel = this.channel
      if (!channel || channel.identity.digest !== access.tokenDigest)
        throw computerOffline()
      return channel.request(operation)
    })
  }

  async fetch(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url)
      if (
        url.origin !== this.env.MACHINE_ORIGIN ||
        url.pathname !== COMPUTER_PATH
      )
        throw credentialRequired()
      const { token, objectId } = computerWebSocketToken(request)
      if (objectId !== this.ctx.id.toString()) throw credentialRequired()
      const digest = await hash(token)
      return await this.ctx.blockConcurrencyWhile(async () => {
        const owner = await findComputerByToken(this.env.DB, digest)
        if (!owner || !this.namesThisObject(owner))
          return errorResponse(credentialRequired())

        if (this.channel) this.close(this.channel, COMPUTER_CLOSE_REPLACED)
        const pair = new WebSocketPair()
        this.ctx.acceptWebSocket(pair[1])
        const state = { ...owner, digest, ready: false, lastId: 0 }
        pair[1].serializeAttachment(state)
        this.channel = new ComputerChannel(pair[1], state)
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
    const channel = this.channel
    if (socket !== channel?.socket) {
      if (socket.readyState === WebSocket.OPEN)
        socket.close(COMPUTER_CLOSE_REVOKED)
      return
    }
    try {
      const hello = channel.receive(value)
      if (!hello) return
      if (hello === 'unsupported') {
        this.close(channel, COMPUTER_CLOSE_UNSUPPORTED_VERSION)
        return
      }
      await this.ctx.blockConcurrencyWhile(async () => {
        if (this.channel !== channel) return
        const accepted = await recordComputerHello(
          this.env.DB,
          channel.identity,
          channel.identity.digest,
          hello,
          Date.now(),
        )
        if (accepted) channel.welcome()
        else this.close(channel, COMPUTER_CLOSE_REVOKED)
      })
    } catch (error) {
      if (this.channel === channel)
        this.close(
          channel,
          1008,
          error instanceof HttpError ? error : undefined,
        )
    }
  }

  webSocketClose(socket: WebSocket): void {
    if (socket === this.channel?.socket) this.close(this.channel, 1000)
  }

  webSocketError(socket: WebSocket): void {
    this.webSocketClose(socket)
  }

  private namesThisObject(owner: ComputerOwner): boolean {
    return computerObjectId(
      computerNamespace(this.env),
      owner.computerId,
    ).equals(this.ctx.id)
  }

  private async checkOwner(owner: ComputerOwner, removed: boolean) {
    if (!this.namesThisObject(owner)) throw computerNotFound()
    const access = await readComputerAccess(this.env.DB, owner)
    if (
      !access ||
      (access.removedAt !== null) !== removed ||
      (this.channel && !sameComputer(owner, this.channel.identity))
    )
      throw computerNotFound()
    return access
  }

  private close(
    channel: ComputerChannel,
    code: number,
    error?: HttpError,
  ): void {
    this.channel = null
    channel.close(code, error)
    if (channel.identity.ready) {
      this.ctx.waitUntil(
        recordComputerDisconnect(
          this.env.DB,
          channel.identity,
          channel.identity.digest,
          Date.now(),
        ).catch(() => undefined),
      )
    }
  }
}
