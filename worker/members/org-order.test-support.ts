import { expect } from 'vitest'

import { API_PATHS, type ApiErrorBody } from '../../src/shared/api'
import type { OrgsResponse } from '../../src/shared/orgs'
import { TEST_TIME, type TestHarness } from '../test-support/harness'
import { memberFixture, write } from './members-test-support'

export async function railFixture(harness: TestHarness) {
  const fixture = await memberFixture(harness)
  const db = harness.env.DB
  for (const [index, id] of ['beta', 'gamma'].entries()) {
    await db
      .prepare(
        'INSERT INTO orgs (id, name, creator_user_id, created_at) VALUES (?, ?, ?, ?)',
      )
      .bind(id, id, fixture.admin.user.id, TEST_TIME - 2 + index)
      .run()
    await db.batch(
      [fixture.admin, fixture.member].map(({ user }) =>
        db
          .prepare(
            "INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)",
          )
          .bind(id, user.id, TEST_TIME + 20 + index),
      ),
    )
  }
  await db
    .prepare(
      "UPDATE org_members SET rail_position = CASE org_id WHEN 'members-org' THEN 0 WHEN 'beta' THEN 1 ELSE 2 END",
    )
    .run()
  return fixture
}

export function move(
  harness: TestHarness,
  session: string,
  orgId: string,
  index: number,
) {
  return harness.request(
    API_PATHS.orgOrder,
    session,
    write({ orgId, index }, 'PUT'),
  )
}

export async function order(harness: TestHarness, session: string) {
  const response = await harness.request(API_PATHS.orgs, session)
  expect(response.status).toBe(200)
  const body: OrgsResponse = await response.json()
  return body.orgs.map((org) => org.id)
}

export async function expectError(
  response: Response,
  status: number,
  code: string,
) {
  expect(response.status).toBe(status)
  const body: ApiErrorBody = await response.json()
  expect(body.error.code).toBe(code)
}

export function pauseWrites(db: D1Database, beforeWrite: () => Promise<void>) {
  const statement = (target: D1PreparedStatement): D1PreparedStatement =>
    new Proxy(target, {
      get(target, key, receiver) {
        if (key === 'bind')
          return (...values: unknown[]) => statement(target.bind(...values))
        if (key === 'run')
          return async () => {
            await beforeWrite()
            return target.run()
          }
        return Reflect.get(target, key, receiver)
      },
    })
  return new Proxy(db, {
    get(target, key, receiver) {
      if (key === 'prepare')
        return (sql: string) => statement(target.prepare(sql))
      return Reflect.get(target, key, receiver)
    },
  })
}
