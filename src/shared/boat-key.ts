import type { BoatKeyStatus } from './api'

/** GET and PUT use boatKeyPath from api.ts. PUT tests the key before it saves. */
export interface SaveBoatKeyRequest {
  key: string
}
export type BoatKeyResponse = BoatKeyStatus
export type SaveBoatKeyResponse = BoatKeyStatus

export type BoatKeyErrorCode =
  'boat_key_refused' | 'boat_unavailable' | 'boat_account_mismatch'
