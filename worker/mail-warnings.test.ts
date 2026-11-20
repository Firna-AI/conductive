import { afterEach, expect, it, vi } from 'vitest'

import { warnWorker } from './warnings'

const canary = 'synthetic-private-mail-canary'
afterEach(() => vi.restoreAllMocks())

it('selects and revalidates mail warning fields without upstream or caller text', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const warning = {
    kind: 'approval_email_delivery_failed' as const,
    error: {
      kind: 'mail' as const,
      reason: 'provider_refused' as const,
      status: 403,
      code: 'validation_error' as const,
      errorType: null,
      name: canary,
      message: canary,
      body: canary,
    },
    message: canary,
    token: canary,
    deliveryKey: canary,
  }
  warnWorker(warning)
  Object.assign(warning.error, {
    reason: canary,
    status: Infinity,
    code: canary,
    errorType: canary,
  })
  warnWorker(warning)
  expect(warn.mock.calls).toEqual([
    [
      {
        kind: 'approval_email_delivery_failed',
        message: 'Approval email delivery failed. The email remains pending.',
        error: {
          kind: 'mail',
          reason: 'provider_refused',
          status: 403,
          code: 'validation_error',
          errorType: null,
        },
      },
    ],
    [
      {
        kind: 'approval_email_delivery_failed',
        message: 'Approval email delivery failed. The email remains pending.',
        error: {
          kind: 'mail',
          reason: 'unknown',
          status: null,
          code: 'unknown',
          errorType: 'unknown',
        },
      },
    ],
  ])
})
