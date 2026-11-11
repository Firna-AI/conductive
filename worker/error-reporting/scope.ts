import {
  Scope,
  getIsolationScope,
  setAsyncLocalStorageAsyncContextStrategy,
  withIsolationScope,
  withScope,
} from '@sentry/cloudflare'

import type { WorkerErrorRuntime } from './runtime'
import type { WorkerWarning } from '../warning-types'
import { workerErrorCause } from './causes'
import type { WorkerCapture, WorkerClassification } from './types'
import type { WorkerErrorDiagnostic } from './types'

setAsyncLocalStorageAsyncContextStrategy()

interface ReportingScope {
  runtime: WorkerErrorRuntime
  metadata: Omit<WorkerCapture, 'classification'>
  waitUntil?: (pending: Promise<unknown>) => void
  captured: WeakSet<object>
}
const scopes = new WeakMap<Scope, ReportingScope>()

export function withWorkerErrorScope<T>(
  runtime: WorkerErrorRuntime,
  metadata: Omit<WorkerCapture, 'classification'>,
  work: () => T,
  waitUntil?: (pending: Promise<unknown>) => void,
  inheritClaims = false,
): T {
  const parent = scopes.get(getIsolationScope())
  return withIsolationScope(new Scope(), (scope) => {
    scopes.set(scope, {
      runtime,
      metadata,
      waitUntil,
      captured:
        inheritClaims && parent?.runtime === runtime
          ? parent.captured
          : new WeakSet(),
    })
    return withScope(new Scope(), work)
  })
}

export function captureWorkerFailure(
  classification: WorkerClassification,
  error?: unknown,
  warning?: WorkerWarning,
): void {
  const scope = scopes.get(getIsolationScope())
  if (scope)
    capture(scope, { ...scope.metadata, classification, warning }, error)
}

export function captureWorkerRequestFailure(
  status: number,
  error?: unknown,
  diagnostic?: WorkerErrorDiagnostic,
): void {
  const scope = scopes.get(getIsolationScope())
  if (!scope || status < 500 || status > 599) return
  capture(
    scope,
    {
      component: 'request',
      classification: 'request_failed',
      request: { ...scope.metadata.request, status },
    },
    error,
    diagnostic,
  )
}

function capture(
  scope: ReportingScope,
  input: WorkerCapture,
  error?: unknown,
  diagnostic?: WorkerErrorDiagnostic,
): void {
  try {
    const cause = workerErrorCause(error)
    if (typeof cause === 'object' && cause !== null) {
      if (scope.captured.has(cause)) return
      scope.captured.add(cause)
    }
    if (diagnostic) scope.runtime.diagnostic(input, diagnostic)
    else scope.runtime.capture(input, error)
    const pending = scope.runtime.flush().catch(() => undefined)
    if (scope.waitUntil) scope.waitUntil(pending)
  } catch {
    // Reporting cannot change the caller's result.
  }
}
