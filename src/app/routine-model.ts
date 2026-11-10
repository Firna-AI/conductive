import { routinePath, type Routine } from '../shared/routines'
import { readRoutineResponse } from './api/read-routines'
import type { OrgModel } from './org-model'
import { Refresher } from './refresh'
import { Resource } from './resource'
import type { Loadable, Readable } from './store'

/**
 * One routine of an org, as its page shows it. It reads when its page
 * mounts and at each return of the user to the page. Its saves go out one
 * at a time, and each answer shows the whole routine.
 */
export class RoutineModel {
  readonly routineId: string
  readonly resource: Resource<Routine>
  readonly routine: Readable<Loadable<Routine>>
  private readonly reads: Refresher<Routine>

  constructor(org: OrgModel, routineId: string) {
    this.routineId = routineId
    this.resource = new Resource(() =>
      org.services.api.get(
        routinePath(org.orgId, routineId),
        readRoutineResponse,
      ),
    )
    this.routine = this.resource.store
    this.reads = new Refresher(this.resource, () => null, org.services)
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
