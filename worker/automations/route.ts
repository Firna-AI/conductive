import {
  automationPath,
  automationsPath,
  type Automation,
  type AutomationsResponse,
} from '../../src/shared/automations'
import {
  requireShellWriter,
  shellChildId,
} from '../app-api/feature-shell-access'
import type { AppDependencies, AppEnv } from '../env'
import type { RequestContext } from '../security/gate'
import { automationNotFound, automationOwnerRequired } from './errors'
import { readAutomationResponse } from './automation-response'
import { latestAutomationRuns } from './latest-run-data'
import {
  prepareAutomation,
  requireAutomationRepository,
  sectionNotFound,
} from './prepare-automation'
import {
  listAutomations,
  readAutomation,
  automationSection,
} from './automation-data'
import {
  deleteAutomation,
  disableAutomation,
  saveAutomation,
} from './automation-write-data'

export async function automationsRoute(
  request: Request,
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
): Promise<Response | null> {
  if (!context.org) return null
  const orgId = context.org.id
  const path = new URL(request.url).pathname
  const parent = automationsPath(orgId)
  const id = shellChildId(path, parent)
  if (path !== parent && (!id || path !== automationPath(orgId, id)))
    return null
  const userId = context.user.id
  if (request.method === 'GET') {
    if (id) return Response.json(await readAutomationResponse(env, orgId, id))
    const automations = await listAutomations(env.DB, orgId)
    const lastRuns = await latestAutomationRuns(env.DB, orgId)
    return Response.json({
      automations: automations.map((automation) => ({
        ...automation,
        lastRun: lastRuns.get(automation.id) ?? null,
      })),
    } satisfies AutomationsResponse)
  }
  if (
    (path === parent && request.method !== 'POST') ||
    (id && !['PATCH', 'DELETE'].includes(request.method))
  )
    return null
  await requireShellWriter(env.DB, orgId, userId)
  const previous = id ? await readAutomation(env.DB, orgId, id) : null
  const body = context.body ?? {}
  const owner = !previous || previous.owner.id === userId
  if (request.method === 'DELETE' && previous) {
    if (!owner && context.org.role !== 'admin') throw automationOwnerRequired()
    if (!(await deleteAutomation(env.DB, orgId, previous.id, userId))) {
      await checkWriteAccess(env, orgId, previous.id, userId, true)
      throw automationNotFound()
    }
    return new Response(null, { status: 204 })
  }
  const disableOnly =
    body.active === false && Object.keys(body).every((key) => key === 'active')
  if (previous && disableOnly) {
    if (!owner && context.org.role !== 'admin') throw automationOwnerRequired()
    if (
      !(await disableAutomation(
        env.DB,
        orgId,
        previous.id,
        userId,
        dependencies.now(),
      ))
    ) {
      await checkWriteAccess(env, orgId, previous.id, userId, true)
      throw automationNotFound()
    }
    return Response.json(await readAutomationResponse(env, orgId, previous.id))
  }
  if (!owner) throw automationOwnerRequired()
  const prepared = await prepareAutomation(
    env,
    orgId,
    context.user,
    body,
    previous,
    dependencies,
  )
  if (
    !(await saveAutomation(
      env.DB,
      prepared,
      userId,
      previous === null,
      body.active !== undefined,
      body.capabilities !== undefined,
    ))
  ) {
    if (previous) await checkWriteAccess(env, orgId, previous.id, userId, false)
    else await requireShellWriter(env.DB, orgId, userId)
    await checkReferences(env, prepared)
    throw automationNotFound()
  }
  return Response.json(await readAutomationResponse(env, orgId, prepared.id), {
    status: previous ? 200 : 201,
  })
}

async function checkWriteAccess(
  env: AppEnv,
  orgId: string,
  id: string,
  userId: string,
  admin: boolean,
): Promise<void> {
  const org = await requireShellWriter(env.DB, orgId, userId)
  const current = await readAutomation(env.DB, orgId, id)
  if (current.owner.id !== userId && !(admin && org.role === 'admin'))
    throw automationOwnerRequired()
}

async function checkReferences(
  env: AppEnv,
  automation: Automation,
): Promise<void> {
  await requireAutomationRepository(
    env.DB,
    automation.orgId,
    automation.repositoryId,
  )
  if (
    !(await automationSection(env.DB, automation.orgId, automation.sectionId))
  )
    throw sectionNotFound()
}
