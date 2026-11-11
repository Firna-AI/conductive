import type { DeviceToWorker } from '../../../src/shared/device.ts'
import type {
  ImportControlResult,
  ImportDeviceEvent,
  ImportDeviceFrame,
  ImportWorkerFrame,
  ImportPrivateAck,
} from '../../../src/shared/conductor-import-operation.ts'
import {
  importPage,
  importWire,
} from '../../../src/shared/conductor-import-pages.ts'
import { importLfsPage } from '../../../src/shared/conductor-import-lfs.ts'
import type { ImportLfsObject } from '../../../src/shared/conductor-import-lfs.ts'
import { LocalImportError } from './types.ts'
import type { ImportFrameSend } from './types.ts'
import type { ImportScheduler } from './scheduler.ts'

type Proof = Extract<ImportControlResult, { kind: 'repository.prerequisites' }>
interface Pending {
  resolve(result: ImportControlResult): void
  reject(error: unknown): void
  proof: Proof | null
  page: number
}

/** Each channel belongs to exactly one authenticated device session. */
export function createImportChannel(
  operationId: string,
  send: (message: DeviceToWorker) => boolean,
  abort: AbortController,
  flow?: { scheduler: ImportScheduler; sendImport?: ImportFrameSend },
) {
  let sequence = 0
  let pending: Pending | undefined
  const frame = (event: ImportDeviceEvent): ImportDeviceFrame => ({
    type: 'import.frame',
    operationId,
    sequence,
    event,
  })
  const stop = () => {
    pending?.reject(new LocalImportError('upload_failed'))
    pending = undefined
    abort.abort()
  }
  abort.signal.addEventListener(
    'abort',
    () => {
      pending?.reject(abort.signal.reason)
      pending = undefined
    },
    { once: true },
  )
  const deliver = (message: ImportDeviceFrame | ImportPrivateAck) => {
    try {
      if (flow?.sendImport)
        void flow.sendImport(message, abort.signal).then((sent) => {
          if (!sent) stop()
        }, stop)
      else if (!send(message)) stop()
    } catch {
      stop()
    }
  }
  const transmit = (event: ImportDeviceEvent): Promise<ImportControlResult> => {
    abort.signal.throwIfAborted()
    if (pending) throw new LocalImportError('upload_failed')
    const message = frame(event)
    importWire(message)
    return new Promise((resolve, reject) => {
      pending = { resolve, reject, proof: null, page: 0 }
      deliver(message)
    })
  }
  let waiting = false
  const exchange = (event: ImportDeviceEvent): Promise<ImportControlResult> => {
    abort.signal.throwIfAborted()
    if (pending || waiting) throw new LocalImportError('upload_failed')
    if (!flow) return transmit(event)
    waiting = true
    return flow.scheduler
      .acquire(abort.signal)
      .then(async (release) => {
        try {
          return await transmit(event)
        } finally {
          release()
        }
      })
      .finally(() => {
        waiting = false
      })
  }
  return {
    exchange,
    page<T>(values: readonly T[], event: (values: T[]) => ImportDeviceEvent) {
      return importPage(values, (page) => frame(event(page)))
    },
    lfsPage(
      objects: readonly ImportLfsObject[],
      reservationId: string,
      factsId: string,
    ) {
      return importLfsPage(objects, {
        operationId,
        sequence,
        reservationId,
        factsId,
      })
    },
    async list<T>(
      values: readonly T[],
      event: (values: T[]) => ImportDeviceEvent,
    ) {
      let offset = 0
      do {
        const page = importPage(values.slice(offset), (page) =>
          frame(event(page)),
        )
        await exchange(event(page))
        offset += page.length
      } while (offset < values.length)
    },
    receive(message: ImportWorkerFrame): void {
      if (message.operationId !== operationId || abort.signal.aborted) return
      if (message.type === 'import.cancel') {
        stop()
        return
      }
      if (!('sequence' in message) || message.sequence !== sequence || !pending)
        return
      if (message.type === 'import.error') {
        stop()
        return
      }
      if (message.type === 'import.part') {
        if (message.page !== pending.page) return
        if (
          pending.proof &&
          pending.proof.receiptId !== message.result.receiptId
        ) {
          stop()
          return
        }
        pending.proof ??= {
          kind: 'repository.prerequisites',
          receiptId: message.result.receiptId,
          verified: [],
          missing: [],
        }
        pending.proof.verified.push(...message.result.verified)
        pending.proof.missing.push(...message.result.missing)
        pending.page++
        const response = {
          type: 'import.part.ack',
          operationId,
          sequence,
          page: message.page,
        } as const
        importWire(response)
        deliver(response)
      }
      if (message.type === 'import.ack') {
        let result = message.result
        if (pending.proof) {
          if (
            result.kind !== 'repository.prerequisites' ||
            result.receiptId !== pending.proof.receiptId ||
            result.verified.length ||
            result.missing.length
          ) {
            stop()
            return
          }
          result = pending.proof
        }
        const completed = pending
        pending = undefined
        sequence++
        completed.resolve(result)
      }
    },
  }
}

export type ImportChannel = ReturnType<typeof createImportChannel>
