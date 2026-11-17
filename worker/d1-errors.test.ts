import { afterAll, beforeAll, expect, it } from 'vitest'

import { d1ErrorReason } from './d1-errors'
import { createHarness, type TestHarness } from './test-support/harness'
import { errorSummary } from './warning-values'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
afterAll(async () => {
  await harness.dispose()
})

async function thrown(work: () => Promise<unknown>): Promise<unknown> {
  try {
    await work()
  } catch (error) {
    return error
  }
  throw new Error('The query did not fail')
}

it('names the reason of real D1 query errors with no text of the error', async () => {
  const db = harness.env.DB
  const missingTable = await thrown(() =>
    db.prepare('SELECT id FROM routine_runs_private_marker').first(),
  )
  expect(errorSummary(missingTable)).toEqual({
    kind: 'd1',
    reason: 'no_such_table',
  })
  expect(
    d1ErrorReason(
      await thrown(() => db.prepare('SELECT private_marker FROM orgs').first()),
    ),
  ).toBe('no_such_column')
  expect(d1ErrorReason(await thrown(() => db.prepare('SELEC 1').first()))).toBe(
    'syntax',
  )
})

it('names the documented platform errors of D1, and other D1 errors as other', () => {
  for (const [message, reason] of [
    [
      'D1_ERROR: UNIQUE constraint failed: orgs.id: SQLITE_CONSTRAINT',
      'constraint',
    ],
    ['D1 DB is overloaded. Too many requests queued.', 'overloaded'],
    ['D1_ERROR: Network connection lost.', 'network'],
    ['D1 DB reset because its code was updated.', 'reset'],
    [
      'Cannot resolve D1 DB due to transient issue on remote node.',
      'transient',
    ],
    ['D1_ERROR: private_marker', 'other'],
  ] as const)
    expect(d1ErrorReason(new Error(message))).toBe(reason)
})

it('keeps the generic kind for errors that D1 did not throw', () => {
  expect(d1ErrorReason(new Error('no such table: private_marker'))).toBeNull()
  expect(d1ErrorReason('D1_ERROR: private_marker')).toBeNull()
  expect(errorSummary(new Error('no such table: private_marker'))).toEqual({
    kind: 'error',
  })
})
