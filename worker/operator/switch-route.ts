import type { OperatorOrgSwitchRequest } from '../../src/shared/operator-switch'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import { configuredProviderAccounts } from '../sandbox/accounts'
import type { RequestContext } from '../security/gate'
import { isOperator } from './access'
import { readOrgSwitchContext } from './switch-context-data'
import { readSwitchRecord } from './switch-data'
import { imageRuntime } from '../lifecycle/runtime'
import {
  wakeProviderSwitch,
  stopProviderSwitchBuild,
} from '../lifecycle/provider-switch-control'
import { readBuildJob, jobSoftware } from '../lifecycle/build-data'
import {
  recordProviderSwitch,
  recordProviderSwitchStop,
} from './switch-write-data'

function invalidSwitch() {
  return new HttpError(
    400,
    'invalid_input',
    'Choose another configured account.',
  )
}

function readSwitchRequest(
  body: Record<string, unknown> | null,
  accounts: readonly string[],
  current: string,
): OperatorOrgSwitchRequest {
  if (
    typeof body?.providerAccount !== 'string' ||
    !accounts.includes(body.providerAccount) ||
    body.providerAccount === current
  )
    throw invalidSwitch()
  if (
    body.endRunningJob !== undefined &&
    typeof body.endRunningJob !== 'boolean'
  )
    throw new HttpError(
      400,
      'invalid_input',
      'Choose whether to end the running job.',
    )
  return {
    providerAccount: body.providerAccount,
    endRunningJob: body.endRunningJob ?? false,
  }
}

export async function operatorSwitchRoute(
  request: Request,
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
): Promise<Response | null> {
  const match = new URL(request.url).pathname.match(
    /^\/api\/operator\/orgs\/([^/]+)\/provider-switch$/,
  )
  if (!match || !['POST', 'DELETE'].includes(request.method)) return null
  if (request.method === 'POST' && env.PROVIDER_SWITCH !== 'on') return null
  if (!isOperator(env, context.user.githubId))
    throw new HttpError(
      403,
      'operator_required',
      'Operator access is required.',
    )
  let orgId: string
  try {
    orgId = decodeURIComponent(match[1])
  } catch {
    throw new HttpError(404, 'org_not_found', 'The org is not available.')
  }
  const org = await readOrgSwitchContext(env.DB, orgId)
  let id: string | null
  if (request.method === 'DELETE') {
    id = await recordProviderSwitchStop(
      env.DB,
      orgId,
      context.user.id,
      dependencies.now(),
    )
    if (id) {
      const runtime = imageRuntime(env, dependencies)
      await stopProviderSwitchBuild(runtime, orgId)
      const stopped = await readSwitchRecord(env.DB, orgId, id)
      if (stopped?.buildId) {
        const job = await readBuildJob(env.DB, orgId, stopped.buildId)
        await runtime.scheduler.schedule(
          orgId,
          jobSoftware(job),
          dependencies.now(),
          job.buildId,
          job.providerAccount,
        )
      }
    }
  } else {
    const input = readSwitchRequest(
      context.body,
      Object.keys(configuredProviderAccounts(env)),
      org.providerAccount,
    )
    id = await recordProviderSwitch(env.DB, {
      id: dependencies.randomToken(),
      orgId,
      toAccount: input.providerAccount,
      operatorId: context.user.id,
      requestedAt: dependencies.now(),
      endRunningJob: input.endRunningJob ?? false,
      runningJobId: org.runningJob?.id ?? null,
      waitReason: org.waitReason,
    })
    if (id === null) throw invalidSwitch()
    await wakeProviderSwitch(imageRuntime(env, dependencies), orgId)
  }
  return Response.json({
    switch: id === null ? null : await readSwitchRecord(env.DB, orgId, id),
  })
}
