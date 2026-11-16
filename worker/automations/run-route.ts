import {
  automationPaths,
  automationsPath,
  type AutomationRunResponse,
  type RunAutomationRequest,
} from '../../src/shared/automations'
import {
  requireShellWriter,
  shellChildId,
} from '../app-api/feature-shell-access'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError, requiredString } from '../http'
import type { RequestContext } from '../security/gate'
import { automationNotFound, automationOwnerRequired } from './errors'
import { listAutomationRuns, readAutomationRun } from './run-list-data'
import { recordAutomationRun } from './run-record-data'
import { automationRunRuntime } from './run-runtime'
import { startAutomationRun } from './run-starter'
import { readAutomation } from './automation-data'

export async function automationRunsRoute(
  request: Request,
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
): Promise<Response | null> {
  if (!context.org) return null
  const orgId = context.org.id
  const url = new URL(request.url)
  const parent = automationsPath(orgId)
  const id = shellChildId(url.pathname.replace(/\/(runs|run-now)$/, ''), parent)
  if (!id) return null
  const list =
    url.pathname === automationPaths.runs(orgId, id) && request.method === 'GET'
  const start =
    url.pathname === automationPaths.runNow(orgId, id) &&
    request.method === 'POST'
  if (!list && !start) return null
  const automation = await readAutomation(env.DB, orgId, id)
  if (list)
    return Response.json(
      await listAutomationRuns(
        env.DB,
        orgId,
        id,
        url.searchParams.get('before'),
      ),
    )
  await requireShellWriter(env.DB, orgId, context.user.id)
  if (automation.owner.id !== context.user.id) throw automationOwnerRequired()
  if (
    automation.triggers.length > 0 &&
    automation.triggers.every((trigger) => trigger.kind === 'pull-request')
  )
    throw new HttpError(
      409,
      'automation_pull_request_required',
      'This automation runs from a pull request event.',
    )
  const input: RunAutomationRequest = {
    requestId: requiredString(context.body?.requestId),
  }
  const runId = await recordAutomationRun(
    env.DB,
    {
      orgId,
      automationId: id,
      runKey: `manual:${id}:${input.requestId}`,
      trigger: { kind: 'run-now' },
      ownerId: context.user.id,
    },
    dependencies,
  )
  if (!runId) throw automationNotFound()
  await startAutomationRun(
    automationRunRuntime(env, dependencies),
    orgId,
    runId,
  )
  return Response.json(
    {
      run: await readAutomationRun(env.DB, orgId, runId),
    } satisfies AutomationRunResponse,
    { status: 201 },
  )
}
