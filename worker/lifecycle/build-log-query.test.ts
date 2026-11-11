import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { readBuildSnapshot } from './build-log-reader'
import { startImageBuild } from './image-builds'

const fixtureForTest = setupBackendTests()

it('reads no retained log rows when polling after the latest event', async () => {
  const { runtime, images, org, user } = fixtureForTest()
  const db = runtime.env.DB
  const id = await startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind: 'build',
    software: SOFTWARE,
  })
  await db
    .prepare(
      `WITH RECURSIVE events(number) AS (
        SELECT 1 UNION ALL SELECT number + 1 FROM events WHERE number < 1000
      )
      INSERT INTO image_build_logs (build_id, event_number, occurred_at, text)
      SELECT ?, number, ?, 'retained ' || number || CHAR(10) FROM events`,
    )
    .bind(id, TEST_TIME)
    .run()
  const emptyIndexRead = await db
    .prepare(
      'SELECT event_number FROM image_build_logs WHERE build_id = ? AND event_number > ? ORDER BY event_number LIMIT ?',
    )
    .bind(id, 1_000, 1)
    .all<{ event_number: number }>()
  expect(emptyIndexRead.results).toEqual([])
  expect(emptyIndexRead.meta.rows_read).toBeGreaterThan(0)
  const readRows: number[] = []
  const readerDatabase = new Proxy(db, {
    get(target, property) {
      if (property === 'batch')
        return async (queries: D1PreparedStatement[]) => {
          const result = await target.batch(queries)
          readRows.push(result[1].meta.rows_read)
          return result
        }
      const value: unknown = Reflect.get(target, property)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })

  const control = await readBuildSnapshot(readerDatabase, org.id, id, 998, 2)
  expect(control.log).toEqual([
    { eventNumber: 999, occurredAt: TEST_TIME, text: 'retained 999\n' },
    { eventNumber: 1_000, occurredAt: TEST_TIME, text: 'retained 1000\n' },
  ])
  expect(readRows).toHaveLength(1)
  expect(readRows[0]).toBeGreaterThan(emptyIndexRead.meta.rows_read)

  const empty = await readBuildSnapshot(readerDatabase, org.id, id, 1_000, 1)
  expect(empty.build).toEqual(control.build)
  expect(empty.log).toEqual([])
  expect(readRows).toHaveLength(2)
  expect(readRows[1]).toBe(emptyIndexRead.meta.rows_read)
})
