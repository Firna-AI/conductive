import type { AppEnv } from '../env'
import {
  readConnectionAccess,
  type PreviewConnectionIdentity,
} from '../security/connection-access'
import type { PreviewRecord } from './store'

export async function readPreviewAccess(
  env: AppEnv,
  identity: PreviewConnectionIdentity,
  now: number,
): Promise<PreviewRecord | null> {
  const [access] = await readConnectionAccess(env.DB, [identity], now)
  return access?.preview ?? null
}
