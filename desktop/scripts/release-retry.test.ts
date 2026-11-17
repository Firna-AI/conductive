import { afterEach, expect, it, vi } from 'vitest'

import { retryAfterTimeLimit } from './release-retry.ts'

afterEach(() => {
  vi.restoreAllMocks()
})

/** A try that ends only when its signal aborts, as a stuck Apple wait does. */
function stuck(signal: AbortSignal): Promise<never> {
  return new Promise((_resolve, reject) => {
    if (signal.aborted) reject(new Error('stopped'))
    signal.addEventListener('abort', () => reject(new Error('stopped')))
  })
}

/** Deadlines that the test ends by hand, one for each try. */
function deadlines() {
  const controllers: AbortController[] = []
  return {
    next: () => {
      const controller = new AbortController()
      controllers.push(controller)
      return controller.signal
    },
    expire: (index: number) => controllers[index].abort(),
    count: () => controllers.length,
  }
}

it('stops a try that runs out of time and starts it once more', async () => {
  const warning = vi.spyOn(process.stderr, 'write').mockReturnValue(true)
  const clock = deadlines()
  const tries: AbortSignal[] = []
  const result = retryAfterTimeLimit(
    'Notarizing Conductive-mac-arm64.dmg',
    new AbortController().signal,
    (signal) => {
      tries.push(signal)
      return tries.length === 1 ? stuck(signal) : Promise.resolve('Accepted')
    },
    clock.next,
  )
  clock.expire(0)

  await expect(result).resolves.toBe('Accepted')
  expect(tries.map((signal) => signal.aborted)).toEqual([true, false])
  expect(warning).toHaveBeenCalledWith(
    'Notarizing Conductive-mac-arm64.dmg took more than 20 minutes. Starting it once more.\n',
  )
})

it('fails when the second try also runs out of time', async () => {
  vi.spyOn(process.stderr, 'write').mockReturnValue(true)
  const clock = deadlines()
  const result = retryAfterTimeLimit(
    'Notarizing Conductive-mac-x64.dmg',
    new AbortController().signal,
    (signal) => {
      const attempt = stuck(signal)
      queueMicrotask(() => clock.expire(clock.count() - 1))
      return attempt
    },
    clock.next,
  )

  await expect(result).rejects.toThrow(
    'Notarizing Conductive-mac-x64.dmg took more than 20 minutes twice',
  )
  expect(clock.count()).toBe(2)
})

it.each([
  ['an Apple rejection', false],
  ['a cancelled release', true],
])('does not start %s again', async (_case, cancelled) => {
  const release = new AbortController()
  const clock = deadlines()
  const work = vi.fn((signal: AbortSignal) => {
    if (!cancelled) return Promise.reject(new Error('Apple rejected it'))
    const attempt = stuck(signal)
    release.abort()
    clock.expire(0)
    return attempt
  })

  await expect(
    retryAfterTimeLimit('Notarizing', release.signal, work, clock.next),
  ).rejects.toThrow(cancelled ? 'stopped' : 'Apple rejected it')
  expect(work).toHaveBeenCalledTimes(1)
})
