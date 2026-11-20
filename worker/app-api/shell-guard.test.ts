import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import {
  guardedBatch,
  guardedRun,
  guardedStatement,
  shellGuard,
  shellRead,
} from './shell-guard'
import {
  setupShellListTests,
  suspendBeforeFirstListBatch,
} from './shell-list.test-support'

const fixtureForTest = setupShellListTests()

it('keeps a section unchanged when org suspension wins the guarded batch', async () => {
  const fixture = fixtureForTest()
  const { db, orgId, user, generalId } = fixture
  const intercepted = suspendBeforeFirstListBatch(fixture)
  const statement = guardedStatement(
    intercepted.db,
    { orgId, userId: user.id },
    `UPDATE sections SET name = ?1, position = ?2
     WHERE id = ?3 AND org_id = ?4 AND ${shellGuard}`,
    ['changed', 42, generalId, orgId],
  )
  const [result] = await guardedBatch(intercepted.db, [statement])
  expect(intercepted.calls()).toBe(1)
  expect(
    await db
      .prepare('SELECT suspended_at FROM orgs WHERE id = ?')
      .bind(orgId)
      .first('suspended_at'),
  ).toBe(TEST_TIME + 100)
  expect(result.meta.changes).toBe(0)
  expect(
    await db
      .prepare('SELECT name, position FROM sections WHERE id = ?')
      .bind(generalId)
      .first(),
  ).toEqual({ name: generalId, position: 0 })
})

it('binds access after numbered values and reuses it at every guard token', async () => {
  const { db, orgId, user, generalId } = fixtureForTest()
  const result = await guardedRun(
    guardedStatement(
      db,
      { orgId, userId: user.id },
      `UPDATE sections SET name = CASE WHEN ${shellGuard} THEN ?2 ELSE name END,
       position = ?3 WHERE org_id = ?1 AND id = ?4 AND ${shellGuard}`,
      [orgId, 'changed', 42, generalId],
    ),
  )
  expect(result.meta.changes).toBe(1)
  expect(
    await shellRead(db, 'SELECT name, position FROM sections WHERE id = ?', [
      generalId,
    ]).first(),
  ).toEqual({ name: 'changed', position: 42 })
})

it('refuses a bare placeholder in a guarded statement', () => {
  const { db, orgId, user } = fixtureForTest()
  expect(() =>
    guardedStatement(
      db,
      { orgId, userId: user.id },
      `SELECT ? WHERE ${shellGuard}`,
      [1],
    ),
  ).toThrow('Use numbered placeholders in a guarded shell statement.')
})

it('refuses a guarded statement without the guard token', () => {
  const { db, orgId, user } = fixtureForTest()
  expect(() =>
    guardedStatement(db, { orgId, userId: user.id }, 'SELECT ?1', [1]),
  ).toThrow('A guarded shell statement must include the shellGuard token.')
})

it('refuses writes in shellRead', () => {
  const { db } = fixtureForTest()
  for (const sql of [
    'UPDATE sections SET position = 42',
    'WITH rows AS (SELECT 1) DELETE FROM sections',
    'SELECT 1; DELETE FROM sections',
  ]) {
    expect(() => shellRead(db, sql)).toThrow(
      'shellRead accepts only a single SELECT statement.',
    )
  }
})
