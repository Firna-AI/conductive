import { expect, it, vi } from 'vitest'

import type { HttpFetch } from '../env'
import { BoatClient } from './boat'

it('aborts detached command starts and status reads at 30 seconds while waited commands keep running', async () => {
  vi.useFakeTimers()
  const timeout = vi
    .spyOn(AbortSignal, 'timeout')
    .mockImplementation((delay) => {
      const controller = new AbortController()
      setTimeout(() => controller.abort(), delay)
      return controller.signal
    })
  try {
    const signals: AbortSignal[] = []
    const fetch: HttpFetch = (request) => {
      signals.push(request.signal)
      return new Promise((_resolve, reject) => {
        request.signal.addEventListener('abort', () =>
          reject(new Error('aborted')),
        )
      })
    }
    const client = new BoatClient('boat-first', fetch, {
      id: 'team-one',
      type: 'org',
    })
    const started = client.startCommand('bx_one', 'npm run build')
    const status = client.getCommandStatus('bx_one', 7, {
      stdoutOffset: 0,
      stderrOffset: 0,
    })
    const waited = client.runCommand('bx_one', 'npm run build')
    const results = Promise.allSettled([started, status, waited])
    await vi.advanceTimersByTimeAsync(29_999)
    expect(signals.map((signal) => signal.aborted)).toEqual([
      false,
      false,
      false,
    ])
    await vi.advanceTimersByTimeAsync(1)
    expect(signals.map((signal) => signal.aborted)).toEqual([true, true, false])
    await expect(started).rejects.toMatchObject({
      kind: 'unavailable',
      status: 503,
    })
    await expect(status).rejects.toMatchObject({
      kind: 'unavailable',
      status: 503,
    })
    await vi.advanceTimersByTimeAsync(580_000)
    expect(signals[2].aborted).toBe(true)
    await expect(waited).rejects.toMatchObject({
      kind: 'unavailable',
      status: 503,
    })
    await results
  } finally {
    timeout.mockRestore()
    vi.useRealTimers()
  }
})
