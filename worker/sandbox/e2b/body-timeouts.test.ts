import { afterEach, expect, it, vi } from 'vitest'

import type { HttpFetch } from '../../env'
import { ProviderError } from '../errors'
import {
  advanceBodyDeadline,
  brokenReply,
  deferred,
  fakeProviderTimers,
  outcome,
  stalledReply,
  type StalledReply,
} from '../body-timeout.test-support'
import { ResponseBudget } from './budgets'
import { E2bControl } from './control'
import { EnvdSession } from './envd'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const requests = [
  {
    name: 'control',
    deadline: 30_000,
    run: (fetch: HttpFetch) =>
      new E2bControl('key', 'e2b.test', fetch).request({
        operation: 'get',
        sandboxId: 'sandbox-one',
      }),
  },
  {
    name: 'envd',
    deadline: 65_000,
    run: (fetch: HttpFetch) =>
      new EnvdSession('https://envd.e2b.test', 'token', fetch).json(
        { operation: 'stat', path: '/file' },
        new ResponseBudget('sandbox'),
      ),
  },
]

it.each(requests)(
  'classifies $name body deadlines as unavailable while preserving error statuses',
  async ({ name, run, deadline }) => {
    fakeProviderTimers()
    await expect(
      run(async () => new Response('{invalid')),
    ).rejects.toMatchObject({
      kind: 'invalid_response',
      status: 502,
    })
    const reset = new DOMException(
      'The stream reset before its deadline.',
      'AbortError',
    )
    const broken = await outcome(run(async () => brokenReply(reset))).result
    expect(broken).toEqual({
      error:
        name === 'envd' ? reset : new ProviderError('invalid_response', 502),
    })
    for (const [status, kind, errorStatus] of [
      [404, 'not_found', 404],
      [503, 'unavailable', 503],
      [200, 'unavailable', 503],
    ] as const) {
      const opened = deferred<StalledReply>()
      const pending = outcome(
        run(async (request) => {
          const reply = stalledReply(request, status)
          opened.resolve(reply)
          return reply.response
        }),
      )
      await advanceBodyDeadline(await opened.promise, pending.settled, deadline)
      expect(await pending.result).toMatchObject({
        error: { kind, status: errorStatus },
      })
    }
  },
)
