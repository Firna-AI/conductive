import type { ImportOperation } from './broker-types'
import { applyImportEvent } from './broker-events'
import { sendImportControl, sendImportFrame } from './broker-socket'
import type {
  ImportAction,
  ImportPublicEvent,
} from '../../src/shared/conductor-import-operation.ts'
import { readImportDeviceFrame } from '../../src/shared/conductor-import-operation-read.ts'
import { importWire } from '../../src/shared/conductor-import-pages.ts'
import type { AppEnv } from '../env'
import type { DeviceConnection } from '../devices/broker-types'
import { HttpError } from '../http'
import {
  importUnavailable,
  requireImportAccess,
  type ImportActor,
} from './access'
import { DEVICE_LEASE_MS } from '../../src/shared/device.ts'
import {
  importInteger,
  importObject,
  importText,
} from '../../src/shared/conductor-import-values.ts'
import type { ImportWorkerFrame } from '../../src/shared/conductor-import-operation.ts'

export class ImportBroker {
  private readonly operations = new Map<string, ImportOperation>()
  private readonly env: AppEnv
  private readonly current: () => DeviceConnection | null
  private readonly now: () => number
  private readonly makeStream: () => TransformStream<Uint8Array, Uint8Array>

  constructor(
    env: AppEnv,
    current: () => DeviceConnection | null,
    now: () => number,
    makeStream = () => new TransformStream<Uint8Array, Uint8Array>(),
  ) {
    this.env = env
    this.current = current
    this.now = now
    this.makeStream = makeStream
  }

  async start(
    actor: ImportActor,
    connection: DeviceConnection,
    action: ImportAction,
    signal: AbortSignal,
  ) {
    await requireImportAccess(this.env.DB, actor, this.now())
    if (
      this.current() !== connection ||
      connection.sessionId !== actor.sessionId ||
      connection.userId !== actor.userId
    )
      throw importUnavailable()
    const stream = this.makeStream()
    const operation: ImportOperation = {
      id: crypto.randomUUID(),
      actor,
      action,
      connection,
      sequence: 0,
      receiving: false,
      reservations: new Set(
        action.action === 'retry' ? [action.reservationId] : [],
      ),
      writer: stream.writable.getWriter(),
      dispose: () => undefined,
    }
    const cancel = () => this.close(operation)
    signal.addEventListener('abort', cancel, { once: true })
    operation.dispose = () => signal.removeEventListener('abort', cancel)
    this.operations.set(operation.id, operation)
    void operation.writer.closed.catch(() => this.close(operation))
    try {
      sendImportFrame(connection, {
        type: 'import.operation',
        operationId: operation.id,
        orgId: actor.orgId,
        operation: action,
      })
      if (signal.aborted) this.close(operation)
    } catch {
      this.close(operation)
      throw importUnavailable()
    }
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  }

  private close(operation: ImportOperation) {
    if (!this.operations.delete(operation.id)) return
    operation.dispose()
    operation.fragment?.reject(new Error('The Mac is not available.'))
    try {
      sendImportFrame(operation.connection, {
        type: 'import.cancel',
        operationId: operation.id,
      })
    } catch {
      /* The paired Mac can already be gone. */
    }
    void operation.writer
      .abort(new Error('The Mac is not available.'))
      .catch(() => undefined)
  }

  closeAll() {
    for (const operation of this.operations.values()) this.close(operation)
  }

  private async live(operation: ImportOperation) {
    if (this.now() - operation.connection.lastSeen >= DEVICE_LEASE_MS)
      throw importUnavailable()
    if (
      this.operations.get(operation.id) !== operation ||
      this.current() !== operation.connection
    )
      throw importUnavailable()
    await requireImportAccess(this.env.DB, operation.actor, this.now())
    if (
      this.current() !== operation.connection ||
      this.operations.get(operation.id) !== operation
    )
      throw importUnavailable()
  }

  private async emit(operation: ImportOperation, event: ImportPublicEvent) {
    await this.live(operation)
    await operation.writer.ready
    await operation.writer.write(
      new TextEncoder().encode(`${importWire(event)}\n`),
    )
    await this.live(operation)
  }

  async receive(connection: DeviceConnection, value: unknown) {
    importWire(value)
    const input = importObject(value)
    if (input.type === 'import.part.ack') {
      const operation = this.operations.get(importText(input.operationId))
      if (
        !operation ||
        operation.connection !== connection ||
        this.current() !== connection
      )
        return
      const pending = operation.fragment
      if (
        pending?.sequence === importInteger(input.sequence) &&
        pending.page === importInteger(input.page)
      ) {
        operation.fragment = undefined
        pending.resolve()
      }
      return
    }
    let frame
    try {
      frame = readImportDeviceFrame(value)
    } catch {
      const operation =
        typeof input.operationId === 'string'
          ? this.operations.get(input.operationId)
          : undefined
      if (operation?.connection === connection) this.close(operation)
      return
    }
    const operation = this.operations.get(frame.operationId)
    if (
      !operation ||
      operation.connection !== connection ||
      this.current() !== connection
    )
      return
    if (operation.receiving || frame.sequence !== operation.sequence) return
    operation.receiving = true
    try {
      await this.live(operation)
      const result = await applyImportEvent(
        this.env,
        operation,
        frame.event,
        this.now,
        (operation, event) => this.emit(operation, event),
      )
      await this.live(operation)
      await sendImportControl(
        connection,
        operation.id,
        frame.sequence,
        result,
        (frame) => this.fragment(operation, frame),
      )
      operation.sequence += 1
      if (frame.event.kind === 'done' || frame.event.kind === 'failed') {
        this.operations.delete(operation.id)
        operation.dispose()
        await operation.writer.close()
      }
    } catch (error) {
      const failure =
        error instanceof HttpError
          ? error
          : new HttpError(
              502,
              'import_failed',
              'The import could not finish. Try again.',
            )
      if (this.current() === connection && this.operations.has(operation.id)) {
        try {
          sendImportFrame(connection, {
            type: 'import.error',
            operationId: operation.id,
            sequence: frame.sequence,
            code: failure.code,
            message: failure.message,
          })
          await this.emit(operation, {
            kind: 'error',
            code: failure.code,
            message: failure.message,
          })
        } catch {
          /* A cancelled page can no longer read its failure. */
        }
      }
      this.close(operation)
    } finally {
      operation.receiving = false
    }
  }

  private async fragment(
    operation: ImportOperation,
    frame: Extract<ImportWorkerFrame, { type: 'import.part' }>,
  ) {
    await this.live(operation)
    await new Promise<void>((resolve, reject) => {
      operation.fragment = {
        sequence: frame.sequence,
        page: frame.page,
        resolve,
        reject,
      }
      try {
        sendImportFrame(operation.connection, frame)
      } catch (error) {
        operation.fragment = undefined
        reject(error)
      }
    })
    await this.live(operation)
  }
}
