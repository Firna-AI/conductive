import type { AppDependencies, AppEnv } from '../env'
import type { WorkerErrorRuntime } from './runtime'
import { responseDiagnostic, responseError } from './causes'
import { workerErrorRuntime } from './production'
import { stripWorkspaceDiagnosticHeader } from './response-diagnostics'
import { workerRouteTemplate } from './routes'
import {
  captureWorkerFailure,
  captureWorkerRequestFailure,
  withWorkerErrorScope,
} from './scope'

type WorkerFetch = (
  request: Request,
  env?: AppEnv,
  execution?: Pick<ExecutionContext, 'waitUntil'>,
) => Promise<Response>

export function workerFetchEntry(
  handle: WorkerFetch,
  dependencies: AppDependencies,
): WorkerFetch {
  return (request, env, execution) => {
    const runtime = workerErrorRuntime(
      env ?? { APP_ORIGIN: '' },
      dependencies.errorReporting,
    )
    return withWorkerErrorScope(
      runtime,
      {
        component: 'request',
        request: {
          method: request.method,
          route: workerRouteTemplate(new URL(request.url).pathname),
          ray: request.headers.get('CF-Ray') ?? undefined,
        },
      },
      async () => {
        const response = stripWorkspaceDiagnosticHeader(
          await handle(request, env, execution),
        )
        captureWorkerRequestFailure(
          response.status,
          responseError(response),
          responseDiagnostic(response),
        )
        return response
      },
      execution ? (pending) => execution.waitUntil(pending) : undefined,
    )
  }
}

export function runWorkspaceAlarm(
  runtime: WorkerErrorRuntime,
  work: () => Promise<void>,
  waitUntil?: (pending: Promise<unknown>) => void,
): Promise<void> {
  return withWorkerErrorScope(
    runtime,
    { component: 'workspace' },
    async () => {
      try {
        await work()
      } catch (error) {
        captureWorkerFailure('workspace_alarm_failed', error)
        throw error
      }
    },
    waitUntil,
  )
}

export function runWorkerCron(
  runtime: WorkerErrorRuntime,
  work: () => Promise<void>,
  waitUntil?: (pending: Promise<unknown>) => void,
): Promise<void> {
  return withWorkerErrorScope(
    runtime,
    { component: 'cron' },
    async () => {
      try {
        await work()
      } catch (error) {
        captureWorkerFailure('cron_failed', error)
        throw error
      }
    },
    waitUntil,
  )
}
