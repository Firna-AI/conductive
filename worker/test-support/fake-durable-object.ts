import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import type { RunnerEventRefusalReason } from '../../src/shared/chat-events'
import type {
  WorkspaceEvent,
  WorkspaceEventEnvelope,
} from '../chat/workspace-events'
import {
  RUNNER_PROTOCOL_VERSION,
  type RunnerCommandV2 as RunnerCommand,
  type RunnerEventEnvelope,
  type RunnerHello,
  type RunnerToWorkspace,
  type WorkspaceToRunnerV2,
} from '../../src/shared/runner'
import type { RunnerConnector } from '../../src/shared/runner-transport'
import type { RunnerFileResponse } from '../../src/shared/runner-files'
import { FakeRunnerFileReports } from './fake-runner-files'
import { FakeRunnerConnection } from './runner-connection'

export interface FakeDurableObjectOptions {
  workspaceId: string
  workspaceToken: string
  origin?: string
  /** Force a permanent refusal without implementing production validation. */
  refuseEvent?: (event: RunnerEventEnvelope) => RunnerEventRefusalReason | null
}

/**
 * Runner tests inject connect in place of their WebSocket connector.
 * This endpoint accepts only runner protocol version 2.
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
  private readonly files = new FakeRunnerFileReports()
  private connection: FakeRunnerConnection<WorkspaceToRunnerV2> | null = null

  constructor(options: FakeDurableObjectOptions) {
    this.options = options
    this.url = new URL(
      MACHINE_PATHS.runner,
      options.origin ?? 'https://machines.conductive.test',
    ).href
  }

  connect: RunnerConnector<WorkspaceToRunnerV2> = (request) => {
    if (
      request.url !== this.url ||
      request.workspaceToken !== this.options.workspaceToken
    ) {
      throw new Error('The runner endpoint refused the connection.')
    }
    this.connection?.close()
    let hello: RunnerHello | null = null
    const connection = new FakeRunnerConnection<WorkspaceToRunnerV2>(
      (message) => {
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
          this.files.beginStream(hello.streamId)
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
      },
    )
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
    connection: FakeRunnerConnection<WorkspaceToRunnerV2>,
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
      const reason = this.options.refuseEvent?.(message) ?? null
      if (!reason) this.runnerEvents.push(structuredClone(message))
      else if (
        message.event.type === 'files.snapshot' ||
        message.event.type === 'changes.updated'
      ) {
        this.files.discard(message.event.type)
      }
      this.cursors.set(message.streamId, message.eventNumber)
      const event: WorkspaceEvent | null = reason
        ? {
            type: 'runner.event-refused',
            streamId: message.streamId,
            runnerEventNumber: message.eventNumber,
            runnerEventType: message.event.type,
            reason,
            sessionId:
              'sessionId' in message.event ? message.event.sessionId : null,
            turnId: 'turnId' in message.event ? message.event.turnId : null,
          }
        : this.browserEvent(message)
      if (event) {
        this.events.push({
          workspaceId: this.options.workspaceId,
          eventNumber: this.events.length + 1,
          occurredAt: message.occurredAt,
          event: structuredClone(event),
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

  private browserEvent(message: RunnerEventEnvelope): WorkspaceEvent | null {
    const event = message.event
    if (event.type === 'runner.ready') return null
    if (
      event.type === 'files.snapshot' ||
      event.type === 'files.unavailable' ||
      event.type === 'files.changed' ||
      event.type === 'changes.updated'
    ) {
      return this.files.accept(message.streamId, event)
    }
    return event
  }
}
