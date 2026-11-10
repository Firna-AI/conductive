import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import { pullRequestFixture } from './pull-request.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

it('checks the owner loop guard in the write when two deliveries overlap', async () => {
  const h = await pullRequestFixture(harness)
  let entered = 0
  let bothEntered: () => void = () => {}
  let release: () => void = () => {}
  const ready = new Promise<void>((resolve) => {
    bothEntered = resolve
  })
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  h.runtime.env.DB = new Proxy(h.db, {
    get(target, property) {
      if (property === 'prepare')
        return (sql: string) => {
          const statement = target.prepare(sql)
          if (!sql.includes('INSERT OR IGNORE INTO routine_runs'))
            return statement
          return new Proxy(statement, {
            get(query, key) {
              if (key === 'bind')
                return (...values: unknown[]) => {
                  const bound = query.bind(...values)
                  return new Proxy(bound, {
                    get(prepared, method) {
                      if (method === 'run')
                        return async () => {
                          if (++entered === 2) bothEntered()
                          await held
                          return prepared.run()
                        }
                      const value: unknown = Reflect.get(prepared, method)
                      return typeof value === 'function'
                        ? value.bind(prepared)
                        : value
                    },
                  })
                }
              const value: unknown = Reflect.get(query, key)
              return typeof value === 'function' ? value.bind(query) : value
            },
          })
        }
      const value: unknown = Reflect.get(target, property)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
  const first = h.request(h.payload(), 'first-delivery')
  const second = h.request(h.payload('synchronize'), 'second-delivery')
  try {
    await ready
    release()
    expect(
      (await Promise.all([first, second])).map((response) => response.status),
    ).toEqual([204, 204])
    expect((await h.rows()).results.map((row) => row.state)).toEqual(['queued'])
    expect(h.background).toHaveLength(1)
  } finally {
    release()
    await Promise.allSettled([first, second])
    h.runtime.env.DB = h.db
  }
})
