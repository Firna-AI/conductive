import type { Envelope } from '@sentry/core'

import type { AppEnv } from '../env'
import { createWorkerErrorRuntime } from '../error-reporting/runtime'
import { workspaceErrorReporting } from '../error-reporting/workspace'

export function nativeReportingFixture(
  context: DurableObjectState,
  env: AppEnv,
  now: () => number,
) {
  const events: Envelope[] = []
  const failure: { next?: Error } = {}
  const storage = context.storage
  storage.get = new Proxy(storage.get, {
    apply(method, _receiver, args: unknown[]) {
      if (failure.next) {
        const error = failure.next
        failure.next = undefined
        throw error
      }
      return Reflect.apply(method, storage, args)
    },
  })
  const runtime = createWorkerErrorRuntime(
    {
      APP_ORIGIN: env.APP_ORIGIN,
      CONDUCTIVE_ERROR_TRACKING_DSN:
        'https://test@s1.eu-nbg-2.betterstackdata.com/1',
    },
    {
      now,
      transport: () => ({
        send(envelope) {
          events.push(structuredClone(envelope))
          return Promise.resolve({ statusCode: 200 })
        },
        flush: () => Promise.resolve(true),
      }),
    },
  )
  return {
    state: context,
    runtime,
    events,
    reporting: workspaceErrorReporting(
      env,
      (pending) => context.waitUntil(pending),
      runtime,
    ),
    arm() {
      const error = new TypeError('private native storage failure')
      failure.next = error
      return error
    },
  }
}
