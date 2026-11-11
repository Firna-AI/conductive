import type { ImportAction } from '../../src/shared/conductor-import-operation.ts'
import type { DeviceConnection } from '../devices/broker-types'
import type { ImportActor } from './access'

export interface ImportOperation {
  id: string
  actor: ImportActor
  action: ImportAction
  connection: DeviceConnection
  sequence: number
  receiving: boolean
  reservations: Set<string>
  writer: WritableStreamDefaultWriter<Uint8Array>
  fragment?: {
    sequence: number
    page: number
    resolve(): void
    reject(error: Error): void
  }
  dispose(): void
}
