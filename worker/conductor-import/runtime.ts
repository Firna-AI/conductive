import type { ImportControlResult } from '../../src/shared/conductor-import-operation.ts'
import { readImportDeviceEvent } from '../../src/shared/conductor-import-operation-read.ts'
import {
  ImportContractError,
  importObject,
  importText,
} from '../../src/shared/conductor-import-values.ts'
import {
  ImportStorageError,
  type ImportStorageScope,
} from '../../src/shared/conductor-import-storage.ts'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import { featureResult } from '../features/result'
import { randomToken } from '../security/crypto'
import { ImportReservationService } from './service'

export const importServiceName = (id: string) => `conductor-import:v1:${id}`
const SCOPE_KEY = 'conductor-import:scope'

export class ImportRuntime {
  private readonly context: DurableObjectState
  private readonly env: AppEnv
  private readonly dependencies: AppDependencies
  private readonly services = new Map<string, ImportReservationService>()

  constructor(context: DurableObjectState, env: AppEnv, now: () => number) {
    this.context = context
    this.env = env
    this.dependencies = { now, randomToken, fetch: (request) => fetch(request) }
  }

  private async service(scope: ImportStorageScope) {
    if (
      !this.env.WORKSPACES?.idFromName(
        importServiceName(scope.reservationId),
      ).equals(this.context.id)
    )
      throw new HttpError(
        403,
        'import_forbidden',
        'The import is not available.',
      )
    const saved = await this.context.storage.get<ImportStorageScope>(SCOPE_KEY)
    if (
      saved &&
      (saved.orgId !== scope.orgId ||
        saved.reservationId !== scope.reservationId)
    )
      throw new HttpError(
        403,
        'import_forbidden',
        'The import is not available.',
      )
    if (!saved) await this.context.storage.put(SCOPE_KEY, scope)
    let service = this.services.get(scope.reservationId)
    if (!service) {
      service = new ImportReservationService(
        this.env,
        scope,
        this.dependencies,
        async (at) => {
          if (at === null) await this.context.storage.deleteAlarm()
          else await this.context.storage.setAlarm(at)
        },
      )
      this.services.set(scope.reservationId, service)
    }
    return service
  }

  async operation(target: string, input: unknown) {
    return featureResult<ImportControlResult>(async () => {
      try {
        const value = importObject(input)
        const scope = {
          orgId: importText(value.orgId),
          reservationId: importText(value.reservationId),
        }
        if (target !== importServiceName(scope.reservationId))
          throw new ImportContractError()
        const service = await this.service(scope)
        const actor = importObject(value.actor)
        return await service.control(
          {
            orgId: scope.orgId,
            userId: importText(actor.userId),
            sessionId: importText(actor.sessionId),
          },
          readImportDeviceEvent(value.event),
        )
      } catch (error) {
        throw importServiceError(error)
      }
    })
  }

  async cleanup(scope: ImportStorageScope, group?: 'work' | 'all') {
    return featureResult(async () => {
      try {
        return await (await this.service(scope)).cleanup(group)
      } catch (error) {
        throw importServiceError(error)
      }
    })
  }

  async alarm(): Promise<boolean> {
    const scope = await this.context.storage.get<ImportStorageScope>(SCOPE_KEY)
    if (!scope) return false
    await (await this.service(scope)).cleanup()
    return true
  }
}

function importServiceError(error: unknown): HttpError {
  if (error instanceof HttpError) return error
  if (error instanceof ImportContractError)
    return new HttpError(400, 'invalid_input', error.message)
  if (error instanceof ImportStorageError && error.code === 'not_configured')
    return new HttpError(
      503,
      'import_storage_unavailable',
      'Import storage is not available. Try again.',
    )
  return new HttpError(
    502,
    'import_failed',
    'The import could not finish. Try again.',
  )
}
