import { CloudflareClient } from '@sentry/cloudflare'
import { serializeEnvelope, type Envelope } from '@sentry/core'
import { vi } from 'vitest'

import { createWorkerErrorRuntime, type WorkerErrorOptions } from './runtime'

const REPORTING_DSN = 'https://privatekey@s1.eu-nbg-2.betterstackdata.com/1'
const REPORTING_RELEASE = `conductive@${'a'.repeat(40)}`

export function reportingFixture(
  options: Partial<WorkerErrorOptions> = {},
  dsn: string | undefined = REPORTING_DSN,
) {
  const envelopes: Envelope[] = []
  const clients: CloudflareClient[] = []
  let now = 1_000_000
  const runtime = createWorkerErrorRuntime(
    {
      APP_ORIGIN: 'https://app.conductive.build',
      CONDUCTIVE_ERROR_TRACKING_DSN: dsn,
    },
    {
      now: () => now,
      release: REPORTING_RELEASE,
      transport: () => ({
        send(envelope) {
          envelopes.push(structuredClone(envelope))
          return Promise.resolve({ statusCode: 200 })
        },
        flush: () => Promise.resolve(true),
      }),
      client: (value) => {
        const client = new CloudflareClient(value)
        clients.push(client)
        return client
      },
      ...options,
    },
  )
  return {
    runtime,
    clients,
    envelopes,
    setNow: (value: number) => (now = value),
    serialized: () => envelopes.map(serializeEnvelope).join('\n'),
  }
}

export function reportingError(): Error {
  const error = new TypeError('private message and private token')
  error.stack = [
    'TypeError: private message and private token',
    '    at fail (https://private.example/private/index.js?token=private:12:4)',
  ].join('\n')
  return error
}

export async function flushReporting(runtime: {
  flush(): Promise<void>
}): Promise<void> {
  const pending = runtime.flush()
  await vi.runAllTimersAsync()
  await pending
}
