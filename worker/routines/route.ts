import {
  routinePath,
  routinesPath,
  type Routine,
  type RoutineResponse,
  type RoutinesResponse,
} from '../../src/shared/routines'
import {
  requireShellWriter,
  shellChildId,
} from '../app-api/feature-shell-access'
import type { AppDependencies, AppEnv } from '../env'
import type { RequestContext } from '../security/gate'
import { routineNotFound, routineOwnerRequired } from './errors'
import { latestRoutineRuns } from './latest-run-data'
import {
  prepareRoutine,
  requireRoutineRepository,
  sectionNotFound,
} from './prepare-routine'
import { listRoutines, readRoutine, routineSection } from './routine-data'
import {
  deleteRoutine,
  disableRoutine,
  saveRoutine,
} from './routine-write-data'

export async function routinesRoute(
  request: Request,
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
): Promise<Response | null> {
  if (!context.org) return null
  const orgId = context.org.id
  const path = new URL(request.url).pathname
  const parent = routinesPath(orgId)
  const id = shellChildId(path, parent)
  if (path !== parent && (!id || path !== routinePath(orgId, id))) return null
  const userId = context.user.id
  if (request.method === 'GET') {
    if (id)
      return Response.json({
        routine: await readRoutine(env.DB, orgId, id),
      } satisfies RoutineResponse)
    const routines = await listRoutines(env.DB, orgId)
    const lastRuns = await latestRoutineRuns(env.DB, orgId)
    return Response.json({
      routines: routines.map((routine) => ({
        ...routine,
        lastRun: lastRuns.get(routine.id) ?? null,
      })),
    } satisfies RoutinesResponse)
  }
  if (
    (path === parent && request.method !== 'POST') ||
    (id && !['PATCH', 'DELETE'].includes(request.method))
  )
    return null
  await requireShellWriter(env.DB, orgId, userId)
  const previous = id ? await readRoutine(env.DB, orgId, id) : null
  const body = context.body ?? {}
  const owner = !previous || previous.owner.id === userId
  if (request.method === 'DELETE' && previous) {
    if (!owner && context.org.role !== 'admin') throw routineOwnerRequired()
    if (!(await deleteRoutine(env.DB, orgId, previous.id, userId))) {
      await checkWriteAccess(env, orgId, previous.id, userId, true)
      throw routineNotFound()
    }
    return new Response(null, { status: 204 })
  }
  const disableOnly =
    body.active === false && Object.keys(body).every((key) => key === 'active')
  if (previous && disableOnly) {
    if (!owner && context.org.role !== 'admin') throw routineOwnerRequired()
    if (
      !(await disableRoutine(
        env.DB,
        orgId,
        previous.id,
        userId,
        dependencies.now(),
      ))
    ) {
      await checkWriteAccess(env, orgId, previous.id, userId, true)
      throw routineNotFound()
    }
    return Response.json({
      routine: await readRoutine(env.DB, orgId, previous.id),
    } satisfies RoutineResponse)
  }
  if (!owner) throw routineOwnerRequired()
  const prepared = await prepareRoutine(
    env,
    orgId,
    context.user,
    body,
    previous,
    dependencies,
  )
  if (
    !(await saveRoutine(
      env.DB,
      prepared,
      userId,
      previous === null,
      body.active !== undefined,
    ))
  ) {
    if (previous) await checkWriteAccess(env, orgId, previous.id, userId, false)
    else await requireShellWriter(env.DB, orgId, userId)
    await checkReferences(env, prepared)
    throw routineNotFound()
  }
  return Response.json(
    {
      routine: await readRoutine(env.DB, orgId, prepared.id),
    } satisfies RoutineResponse,
    { status: previous ? 200 : 201 },
  )
}

async function checkWriteAccess(
  env: AppEnv,
  orgId: string,
  id: string,
  userId: string,
  admin: boolean,
): Promise<void> {
  const org = await requireShellWriter(env.DB, orgId, userId)
  const current = await readRoutine(env.DB, orgId, id)
  if (current.owner.id !== userId && !(admin && org.role === 'admin'))
    throw routineOwnerRequired()
}

async function checkReferences(env: AppEnv, routine: Routine): Promise<void> {
  await requireRoutineRepository(env.DB, routine.orgId, routine.repositoryId)
  if (!(await routineSection(env.DB, routine.orgId, routine.sectionId)))
    throw sectionNotFound()
}
