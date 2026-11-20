import type { E2bControl } from './control'
import type { HttpFetch } from '../../env'
import type { ProviderAllocationMode } from '../provider'

export interface E2bContext {
  db: D1Database
  accountId: string
  encryptionKey: string
  templateId: string
  domain: string
  fetch: HttpFetch
  readonly allocationMode: ProviderAllocationMode
  control: E2bControl
}

export interface Rejection {
  rejectionStatus: number | null
  rejectionCode: string | null
  rejectionRetrySeconds: number | null
}
