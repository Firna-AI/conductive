import {
  routinePath,
  routinesPath,
  type CreateRoutineRequest,
  type Routine,
  type RoutineRun,
  type UpdateRoutineRequest,
} from '../shared/routines'
import { ignore } from './api/parse'
import { readRoutineResponse, type ListedRoutine } from './api/read-routines'
import type { OrgModel } from './org-model'
import type { Change } from './resource'
import { forgetRoutine, routineModel } from './routine-model'

/*
 * The writes of a routine. Each answer of a create or an update is the
 * whole routine: the routine page shows it, and the Routines list takes it
 * at once, with the last run that the list already has. The writes of a
 * saved routine go through the client of its model, so a refusal with
 * `routine_not_found` reads the routine again.
 */

/** A newer record of a routine. A routine that the list lacks goes first. */
function routinePut(routine: Routine): Change<readonly ListedRoutine[]> {
  return (list) => {
    if (!list.some((item) => item.id === routine.id)) {
      return [{ ...routine, lastRun: null }, ...list]
    }
    return list.map((item) =>
      item.id === routine.id ? { ...routine, lastRun: item.lastRun } : item,
    )
  }
}

function routineRemoved(routineId: string): Change<readonly ListedRoutine[]> {
  return (list) => list.filter((item) => item.id !== routineId)
}

export async function createRoutine(
  org: OrgModel,
  request: CreateRoutineRequest,
): Promise<Routine> {
  const routine = await org.services.api.send(
    'POST',
    routinesPath(org.orgId),
    request,
    readRoutineResponse,
  )
  // The page of the new routine shows the answer at once, without a read.
  await routineModel(org, routine.id).resource.save(async () => routine)
  org.resources.routines.confirm(routinePut(routine), `routine ${routine.id}`)
  return routine
}

/** Saves the fields of a routine that changed, after its earlier saves. */
export async function updateRoutine(
  org: OrgModel,
  routineId: string,
  request: UpdateRoutineRequest,
): Promise<Routine> {
  const model = routineModel(org, routineId)
  const routine = await model.resource.save(() =>
    model.client.send(
      'PATCH',
      routinePath(org.orgId, routineId),
      request,
      readRoutineResponse,
    ),
  )
  org.resources.routines.confirm(routinePut(routine), `routine ${routineId}`)
  return routine
}

/**
 * Turn off of the owner or an admin. It sends Active alone, which the
 * Worker also takes from an admin who does not own the routine.
 */
export function turnOffRoutine(
  org: OrgModel,
  routineId: string,
): Promise<Routine> {
  return updateRoutine(org, routineId, { active: false })
}

/** Deletes a routine. Its run workspaces stay, as normal workspaces do. */
export async function deleteRoutine(
  org: OrgModel,
  routineId: string,
): Promise<void> {
  await routineModel(org, routineId).client.send(
    'DELETE',
    routinePath(org.orgId, routineId),
    {},
    ignore,
  )
  forgetRoutine(org, routineId)
  org.resources.routines.confirm(
    routineRemoved(routineId),
    `routine ${routineId}`,
  )
}

/**
 * Run now of the owner. Its run shows first in the Runs list, and as the
 * last run of the routine in the Routines list. The workspace list reads
 * again at once, so the new run workspace shows in it before the next
 * timer.
 */
export async function runRoutine(
  org: OrgModel,
  routineId: string,
): Promise<RoutineRun> {
  const run = await routineModel(org, routineId).runs.runNow()
  org.resources.routines.confirm(
    (list) =>
      list.map((item) =>
        item.id === routineId ? { ...item, lastRun: run } : item,
      ),
    `last run ${routineId}`,
  )
  if (run.workspaceId !== null) void org.reload('list')
  return run
}
