import { CloudflareClient } from '@sentry/cloudflare'
import { Scope } from '@sentry/core'

import {
  ERROR_TRACKING_RELEASE,
  errorTrackingDsnOrigin,
} from '../../src/shared/error-reporting'
import type { AppEnv } from '../env'
import { warnWorker } from '../warnings'
import { rebuildWorkerErrorEvent } from './event'
import {
  record,
  workerErrorDiagnostic,
  workerFrames,
  workerStackParser,
} from './frames'
import { workerErrorClassName } from './class-name'
import { knownWorkerErrorCode } from './codes'
import { workerWarningTags } from './values'
import { WorkerErrorLimiter } from './suppression'
import {
  privateWorkerTransport,
  type ApprovedWorkerEvent,
  type WorkerTransportFactory,
} from './transport'
import type {
  WorkerCapture,
  WorkerErrorDiagnostic,
  WorkerEventContext,
} from './types'

type ClientOptions = ConstructorParameters<typeof CloudflareClient>[0]
export interface WorkerErrorOptions {
  now: () => number
  release?: string
  transport?: WorkerTransportFactory
  client?: (options: ClientOptions) => CloudflareClient
  warn?: typeof warnWorker
  limiter?: WorkerErrorLimiter
}

export interface WorkerErrorRuntime {
  capture(input: WorkerCapture, error?: unknown): void
  diagnostic(input: WorkerCapture, diagnostic: WorkerErrorDiagnostic): void
  flush(): Promise<void>
}

export function createWorkerErrorRuntime(
  env: Pick<AppEnv, 'APP_ORIGIN' | 'CONDUCTIVE_ERROR_TRACKING_DSN'>,
  options: WorkerErrorOptions,
): WorkerErrorRuntime {
  const approved = new WeakMap<object, ApprovedWorkerEvent>()
  const tokens = new WeakMap<object, WorkerEventContext>()
  const limiter = options.limiter ?? new WorkerErrorLimiter(options.now)
  let client: CloudflareClient | undefined
  const dsn = env.CONDUCTIVE_ERROR_TRACKING_DSN
  const warn = options.warn ?? warnWorker
  try {
    if (dsn && errorTrackingDsnOrigin(dsn)) {
      client = (options.client ?? ((value) => new CloudflareClient(value)))({
        dsn,
        integrations: [],
        stackParser: workerStackParser,
        transport: (value) =>
          privateWorkerTransport(value, approved, options.transport),
        debug: false,
        sendClientReports: false,
        maxBreadcrumbs: 0,
        traceLifecycle: 'static',
        tracePropagationTargets: [],
        beforeSendLog: () => null,
        beforeSendMetric: () => null,
        dataCollection: {
          userInfo: false,
          cookies: false,
          httpHeaders: false,
          httpBodies: [],
          urlQueryParams: false,
          stackFrameVariables: false,
          frameContextLines: 0,
          graphQL: { document: false, variables: false },
          genAI: { inputs: false, outputs: false },
          mcp: { inputs: false, outputs: false },
          databaseQueryData: false,
          queues: false,
        },
        beforeSend(event, hint) {
          const data: unknown = hint.data
          const context = record(data) ? tokens.get(data) : undefined
          if (!context) return null
          const rebuilt = rebuildWorkerErrorEvent(event, context)
          if (!rebuilt?.event_id) return null
          const exception = rebuilt.exception?.values?.[0]
          const frame = exception?.stacktrace?.frames?.find(
            (item) => item.in_app,
          )
          const key = JSON.stringify([
            context.classification,
            exception?.type,
            rebuilt.tags?.['http.route'],
            frame,
          ])
          if (!limiter.admit(key)) return null
          const snapshot = rebuildWorkerErrorEvent(rebuilt, context)
          if (!snapshot) return null
          approved.set(rebuilt, {
            context,
            eventId: rebuilt.event_id,
            snapshot,
          })
          return rebuilt
        },
      })
      client.init()
    } else if (dsn) {
      warn({ kind: 'error_tracking_dsn_invalid' })
    }
  } catch {
    client = undefined
  }
  const runtime: WorkerErrorRuntime = {
    capture(input, error) {
      if (!client) return
      runtime.diagnostic(input, workerErrorDiagnostic(error))
    },
    diagnostic(input, diagnostic) {
      if (!client) return
      try {
        const token = {}
        const verified: WorkerErrorDiagnostic = {
          type: workerErrorClassName(diagnostic.type),
          frames: workerFrames(diagnostic.frames),
          code: knownWorkerErrorCode(diagnostic.code),
        }
        tokens.set(token, {
          component: input.component,
          classification: input.classification,
          request: input.request
            ? {
                method: input.request.method,
                route: input.request.route,
                ray: input.request.ray,
                status: input.request.status,
              }
            : undefined,
          warningTags: input.warning
            ? workerWarningTags(input.warning)
            : undefined,
          diagnostic: verified,
          environment:
            env.APP_ORIGIN === 'https://app.conductive.build'
              ? 'production'
              : 'development',
          release: options.release ?? ERROR_TRACKING_RELEASE,
          timestamp: options.now() / 1000,
          errorCode: verified.code,
        })
        client.captureEvent(
          {
            exception: {
              values: [
                {
                  type: verified.type,
                  stacktrace: { frames: workerFrames(verified.frames) },
                },
              ],
            },
          },
          { data: token },
          new Scope(),
        )
      } catch {
        // A diagnostic failure cannot replace the application's result.
      }
    },
    async flush() {
      try {
        await client?.flush(2000)
      } catch {
        // The caller's response or original thrown error remains authoritative.
      }
    },
  }
  return runtime
}
