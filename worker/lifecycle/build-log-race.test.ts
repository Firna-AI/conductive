import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { failBuild } from './build-data'
import { buildEventsResponse } from './build-stream'
import { startImageBuild } from './image-builds'

const fixtureForTest = setupBackendTests()

it('delivers the final failure log when completion races an empty log read', async () => {
  const { runtime, images, org, user } = await fixtureForTest()
  const id = await startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind: 'build',
    software: SOFTWARE,
  })
  const db = runtime.env.DB
  const prepare = db.prepare.bind(db)
  const batch = db.batch.bind(db)
  const logReads = new WeakSet<D1PreparedStatement>()
  let completed = false
  const complete = async () => {
    if (completed) return
    completed = true
    await failBuild(db, id, 'The final image failure.\n', TEST_TIME + 1)
  }
  const readStatement = (query: string) => {
    const statement = prepare(query)
    if (!query.includes('FROM image_build_logs')) return statement
    const wrap = (bound: D1PreparedStatement): D1PreparedStatement => {
      const wrapped = new Proxy(bound, {
        get(target, property) {
          if (property === 'bind')
            return (...values: unknown[]) => wrap(target.bind(...values))
          if (property === 'first')
            return async (
              ...args: Parameters<D1PreparedStatement['first']>
            ) => {
              const result = await target.first(...args)
              await complete()
              return result
            }
          const value: unknown = Reflect.get(target, property)
          return typeof value === 'function' ? value.bind(target) : value
        },
      })
      logReads.add(wrapped)
      return wrapped
    }
    return wrap(statement)
  }
  const readBatch = async (queries: D1PreparedStatement[]) => {
    const result = await batch(queries)
    if (queries.some((query) => logReads.has(query))) await complete()
    return result
  }
  const readerDatabase = new Proxy(db, {
    get(target, property) {
      if (property === 'prepare') return readStatement
      if (property === 'batch') return readBatch
      const value: unknown = Reflect.get(target, property)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
  const response = await buildEventsResponse({
    env: { ...runtime.env, DB: readerDatabase },
    orgId: org.id,
    userId: user.id,
    buildId: id,
    after: 0,
    wait: async () => {},
  })
  expect(await response.text()).toBe(
    `id: 1\nevent: log\ndata: ${JSON.stringify({ eventNumber: 1, occurredAt: TEST_TIME + 1, text: 'The final image failure.\n' })}\n\nevent: build\ndata: ${JSON.stringify({ id, orgId: org.id, kind: 'build', refreshCause: null, state: 'failed', startedAt: TEST_TIME, completedAt: TEST_TIME + 1, durationMs: 1, error: 'The final image failure.\n' })}\n\n`,
  )
})
