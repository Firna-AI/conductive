import { afterAll, beforeAll, beforeEach, it } from 'vitest'

import { API_PATHS } from '../../src/shared/api'
import {
  createHarness,
  TEST_ORIGIN,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { memberFixture, write } from './members-test-support'
import { expectError, move } from './org-order.test-support'

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

it('keeps sign-in, Origin, JSON, app access, and suspended-user checks on org moves', async () => {
  const { org, member, other } = await memberFixture(harness)
  const body = JSON.stringify({ orgId: org.id, index: 0 })
  const send = (headers: HeadersInit, content = body) =>
    harness.fetch(API_PATHS.orgOrder, { method: 'PUT', headers, body: content })
  await expectError(
    await send({ Origin: TEST_ORIGIN, 'Content-Type': 'application/json' }),
    401,
    'sign_in_required',
  )
  await expectError(
    await send({
      Origin: 'https://elsewhere.test',
      Cookie: member.session,
      'Content-Type': 'application/json',
    }),
    403,
    'origin_forbidden',
  )
  await expectError(
    await send({
      Origin: TEST_ORIGIN,
      Cookie: member.session,
      'Content-Type': 'text/plain',
    }),
    415,
    'json_required',
  )
  await expectError(
    await send(
      {
        Origin: TEST_ORIGIN,
        Cookie: member.session,
        'Content-Type': 'application/json',
      },
      '{',
    ),
    400,
    'invalid_json',
  )
  await harness.env.DB.prepare('DELETE FROM user_app_access WHERE user_id = ?')
    .bind(other.user.id)
    .run()
  await expectError(
    await move(harness, other.session, org.id, 0),
    403,
    'access_required',
  )
  await harness.env.DB.prepare('UPDATE users SET suspended_at = ? WHERE id = ?')
    .bind(TEST_TIME, member.user.id)
    .run()
  await expectError(
    await harness.request(
      API_PATHS.orgOrder,
      member.session,
      write({ orgId: org.id, index: 0 }, 'PUT'),
    ),
    401,
    'sign_in_required',
  )
})
