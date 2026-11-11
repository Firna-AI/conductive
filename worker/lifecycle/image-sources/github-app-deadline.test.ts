import { afterEach, expect, it, vi } from 'vitest'

import { installationToken, revokeInstallationToken } from './github-app'
import {
  accessFailure,
  heldGitHubFetch,
  now,
  privateKey,
  repository,
  revokeFailure,
} from './github-app.test-support'

afterEach(() => {
  vi.useRealTimers()
})

it.each(['mint', 'revoke'] as const)(
  'aborts a held image token %s request at the existing deadline with a safe error',
  async (kind) => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const held = heldGitHubFetch()
    let settled = false
    const pending =
      kind === 'mint'
        ? installationToken(
            held.fetch,
            'github-client-id',
            privateKey,
            repository,
            now,
          )
        : revokeInstallationToken(held.fetch, 'private-installation-token')
    const outcome = pending.then(
      (value) => {
        settled = true
        return { state: 'completed', value }
      },
      (error: unknown) => {
        settled = true
        return { state: 'failed', error }
      },
    )
    try {
      await held.ready
      await vi.advanceTimersByTimeAsync(29_999)
      expect(held.request().signal.aborted).toBe(false)
      expect(settled).toBe(false)
      await vi.advanceTimersByTimeAsync(1)
      expect(held.request().signal.aborted).toBe(true)
      expect(await outcome).toEqual({
        state: 'failed',
        error: kind === 'mint' ? accessFailure : revokeFailure,
      })
    } finally {
      held.reply(Response.json({ token: 'cleanup' }))
      await outcome
    }
  },
)

it('keeps the revocation deadline active until response-body cancellation ends', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  let entered: () => void = () => {}
  const cancelling = new Promise<void>((resolve) => {
    entered = resolve
  })
  let release: () => void = () => {}
  let captured: Request | undefined
  const pending = revokeInstallationToken(async (request) => {
    captured = request
    return new Response(
      new ReadableStream<Uint8Array>({
        cancel: () =>
          new Promise<void>((resolve, reject) => {
            release = resolve
            request.signal.addEventListener(
              'abort',
              () => reject(new Error('private cancellation detail')),
              { once: true },
            )
            entered()
          }),
      }),
      { status: 401 },
    )
  }, 'private-installation-token')
  const outcome = pending.then(
    () => ({ state: 'completed' }),
    (error: unknown) => ({ state: 'failed', error }),
  )
  try {
    await cancelling
    if (!captured) throw new Error('The GitHub request has not started.')
    await vi.advanceTimersByTimeAsync(29_999)
    expect(captured.signal.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(captured.signal.aborted).toBe(true)
    expect(await outcome).toEqual({ state: 'failed', error: revokeFailure })
  } finally {
    release()
    await outcome
  }
})
