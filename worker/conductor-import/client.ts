import type { ImportDeviceEvent } from '../../src/shared/conductor-import-operation.ts'
import type { AppEnv } from '../env'
import { workspaceBinding } from '../app-api/workspace-state'
import { requireFeatureResult } from '../features/result'
import type { ImportActor } from './access'
import { importServiceName } from './runtime'

export async function callImportService(
  env: AppEnv,
  actor: ImportActor,
  reservationId: string,
  event: ImportDeviceEvent,
) {
  const target = importServiceName(reservationId)
  return requireFeatureResult(
    await workspaceBinding(env)
      .getByName(target)
      .conductorImportOperation(target, {
        orgId: actor.orgId,
        reservationId,
        actor,
        event,
      }),
  )
}
