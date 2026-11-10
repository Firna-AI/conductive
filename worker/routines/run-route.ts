import {
  routinePaths,
  routinesPath,
  type RoutineRunResponse,
  type RunRoutineRequest,
} from '../../src/shared/routines'
import {
  requireShellWriter,
  shellChildId,
} from '../app-api/feature-shell-access'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError, requiredString } from '../http'
import type { RequestContext } from '../security/gate'
import { routineNotFound, routineOwnerRequired } from './errors'
import { listRoutineRuns, readRoutineRun } from './run-list-data'
import { recordRoutineRun } from './run-record-data'
import { routineRunRuntime } from './run-runtime'
import { startRoutineRun } from './run-starter'
import { readRoutine } from './routine-data'

export async function routineRunsRoute(
  request: Request,
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
): Promise<Response | null> {
  if (!context.org) return null
  const orgId = context.org.id
  const url = new URL(request.url)
  const parent = routinesPath(orgId)
  const id = shellChildId(url.pathname.replace(/\/(runs|run-now)$/, ''), parent)
  if (!id) return null
  const list =
    url.pathname === routinePaths.runs(orgId, id) && request.method === 'GET'
  const start =
    url.pathname === routinePaths.runNow(orgId, id) && request.method === 'POST'
  if (!list && !start) return null
  const routine = await readRoutine(env.DB, orgId, id)
  if (list)
    return Response.json(
      await listRoutineRuns(env.DB, orgId, id, url.searchParams.get('before')),
    )
  await requireShellWriter(env.DB, orgId, context.user.id)
  if (routine.owner.id !== context.user.id) throw routineOwnerRequired()
  if (
    routine.triggers.length > 0 &&
    routine.triggers.every((trigger) => trigger.kind === 'pull-request')
  )
    throw new HttpError(
      409,
      'routine_pull_request_required',
      'This routine runs from a pull request event.',
    )
  const input: RunRoutineRequest = {
    requestId: requiredString(context.body?.requestId),
  }
  const runId = await recordRoutineRun(
    env.DB,
    {
      orgId,
      routineId: id,
      runKey: `manual:${id}:${input.requestId}`,
      trigger: { kind: 'run-now' },
      ownerId: context.user.id,
    },
    dependencies,
  )
  if (!runId) throw routineNotFound()
  await startRoutineRun(routineRunRuntime(env, dependencies), orgId, runId)
  return Response.json(
    {
      run: await readRoutineRun(env.DB, orgId, runId),
    } satisfies RoutineRunResponse,
    { status: 201 },
  )
}
