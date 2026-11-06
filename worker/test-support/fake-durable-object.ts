import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import type { WorkspaceEventEnvelope } from '../../src/shared/events'
import {
  RUNNER_PROTOCOL_VERSION,
  type RunnerCommand,
  type RunnerEventEnvelope,
  type RunnerHello,
  type RunnerToWorkspace,
} from '../../src/shared/runner'
import type { RunnerConnector } from '../../src/shared/runner-transport'
import type { RunnerFileResponse } from '../../src/shared/runner-files'
import { FakeRunnerConnection } from './runner-connection'

export interface FakeDurableObjectOptions {
  workspaceId: string
  workspaceToken: string
  origin?: string
}

/**
 * Runner tests inject connect in place of their WebSocket connector.
 * This endpoint stores normalized events and confirms only contiguous numbers.
 * State stays on this instance when a test drops and reconnects a socket.
 */
export class FakeDurableObjectEndpoint {
  readonly url: string
  readonly received: RunnerToWorkspace[] = []
  readonly runnerEvents: RunnerEventEnvelope[] = []
  readonly events: WorkspaceEventEnvelope[] = []
  readonly fileResponses: RunnerFileResponse[] = []
  confirmEvents = true
  private readonly cursors = new Map<string, number>()
  private readonly options: FakeDurableObjectOptions
  private connection: FakeRunnerConnection | null = null

  constructor(options: FakeDurableObjectOptions) {
    this.options = options
    this.url = new URL(
      MACHINE_PATHS.runner,
      options.origin ?? 'https://machines.conducting.test',
    ).href
  }

  connect: RunnerConnector = (request) => {
    if (
      request.url !== this.url ||
      request.workspaceToken !== this.options.workspaceToken
    ) {
      throw new Error('The runner endpoint refused the connection.')
    }
    this.connection?.close()
    let hello: RunnerHello | null = null
    const connection = new FakeRunnerConnection((message) => {
      this.received.push(structuredClone(message))
      if (message.type === 'hello') {
        if (
          message.workspaceId !== this.options.workspaceId ||
          message.protocolVersion !== RUNNER_PROTOCOL_VERSION
        ) {
          connection.close()
          throw new Error('The runner hello does not match this workspace.')
        }
        hello = message
        connection.reply({
          type: 'welcome',
          protocolVersion: RUNNER_PROTOCOL_VERSION,
          streamId: hello.streamId,
          confirmedThrough: this.cursors.get(hello.streamId) ?? 0,
        })
        return
      }
      if (!hello) {
        throw new Error('Send the runner hello before events.')
      }
      if (message.type !== 'event') {
        this.fileResponses.push(structuredClone(message))
        return
      }
      if (message.streamId !== hello.streamId) {
        throw new Error('The event stream does not match the runner hello.')
      }
      this.store(message, connection)
    })
    connection.onClose(() => {
      if (this.connection === connection) this.connection = null
    })
    this.connection = connection
    return connection
  }

  send(command: RunnerCommand): void {
    if (!this.connection) throw new Error('Connect the runner before commands.')
    this.connection.reply(command)
  }

  disconnect(): void {
    this.connection?.close()
    this.connection = null
  }

  private store(
    message: RunnerEventEnvelope,
    connection: FakeRunnerConnection,
  ): void {
    const through = this.cursors.get(message.streamId) ?? 0
    if (message.eventNumber > through + 1) {
      connection.reply({
        type: 'resend',
        streamId: message.streamId,
        fromEventNumber: through + 1,
      })
      return
    }
    if (message.eventNumber === through + 1) {
      this.runnerEvents.push(structuredClone(message))
      this.cursors.set(message.streamId, message.eventNumber)
      if (message.event.type !== 'runner.ready') {
        this.events.push({
          workspaceId: this.options.workspaceId,
          eventNumber: this.events.length + 1,
          occurredAt: message.occurredAt,
          event: structuredClone(message.event),
        })
      }
    }
    if (this.confirmEvents) {
      connection.reply({
        type: 'confirm',
        streamId: message.streamId,
        throughEventNumber: this.cursors.get(message.streamId) ?? 0,
      })
    }
  }
}
