import { routinePath, type Routine } from '../shared/routines'
import { ApiError, type ApiClient } from './api/client'
import { readRoutineResponse } from './api/read-routines'
import type { OrgModel } from './org-model'
import { Refresher } from './refresh'
import { Resource } from './resource'
import { RoutineRuns } from './routine-runs'
import type { Loadable, Readable } from './store'

/** The code of the API for a routine that the org does not have. */
const routineNotFound = 'routine_not_found'

/** Whether an error says that the org does not have the routine. */
function isRoutineMissing(error: unknown): boolean {
  return error instanceof ApiError && error.code === routineNotFound
}

/**
 * The client of the requests of a routine page beside the read of the
 * routine. A refusal with `routine_not_found` calls `recheck`, then goes to
 * the caller. A write can get that refusal also while the routine exists,
 * so only a read of the routine decides.
 */
function noteMissingRoutine(api: ApiClient, recheck: () => void): ApiClient {
  const watch = async <T>(request: Promise<T>): Promise<T> => {
    try {
      return await request
    } catch (error) {
      if (isRoutineMissing(error)) recheck()
      throw error
    }
  }
  return {
    fetch: api.fetch,
    get: (path, read) => watch(api.get(path, read)),
    send: (method, path, body, read) =>
      watch(api.send(method, path, body, read)),
    sendPart: (path, part, read, hooks) =>
      watch(api.sendPart(path, part, read, hooks)),
  }
}

/**
 * One routine of an org, as its page shows it, with its runs. It reads when
 * its page mounts and at each return of the user to the page. Its saves go
 * out one at a time, and each answer shows the whole routine. A read that
 * the API refuses with `routine_not_found` shows that the routine is not
 * available, also in place of the routine. Any other failed read keeps the
 * routine that shows.
 */
export class RoutineModel {
  readonly routineId: string
  readonly resource: Resource<Routine>
  readonly routine: Readable<Loadable<Routine>>
  /**
   * The client of each request of the page beside the read of the routine:
   * the reads of the runs, Show older runs, Save, Turn off, Run now, and
   * Delete. A `routine_not_found` from any of them reads the routine again.
   */
  readonly client: ApiClient
  readonly runs: RoutineRuns
  private readonly reads: Refresher<Routine>

  constructor(org: OrgModel, routineId: string) {
    this.routineId = routineId
    this.resource = new Resource(
      () =>
        org.services.api.get(
          routinePath(org.orgId, routineId),
          readRoutineResponse,
        ),
      { missing: isRoutineMissing },
    )
    this.routine = this.resource.store
    this.reads = new Refresher(this.resource, () => null, org.services)
    this.client = noteMissingRoutine(
      org.services.api,
      () => void this.reads.reread(),
    )
    this.runs = new RoutineRuns(org, routineId, this.client)
  }

  /** The page shows the routine. The result says that it no longer does. */
  watch(): () => void {
    return this.reads.watch()
  }

  /** Reads the routine now, such as for Try again. */
  reload(): Promise<void> {
    return this.reads.refresh()
  }
}

/** The routine models of each org model, by routine. */
const models = new WeakMap<OrgModel, Map<string, RoutineModel>>()

/**
 * The model of a routine of an org. It stays while the app keeps the org
 * model, so a return to the routine shows it at once.
 */
export function routineModel(org: OrgModel, routineId: string): RoutineModel {
  let routines = models.get(org)
  if (!routines) {
    routines = new Map()
    models.set(org, routines)
  }
  let model = routines.get(routineId)
  if (!model) {
    model = new RoutineModel(org, routineId)
    routines.set(routineId, model)
  }
  return model
}

/**
 * Forgets the model of a deleted routine. A later visit of its address
 * reads it again, and shows that it is not available.
 */
export function forgetRoutine(org: OrgModel, routineId: string): void {
  models.get(org)?.delete(routineId)
}
