import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import {
  addInviteCode,
  useCode,
  uses,
  waitingInvitation,
} from './waitlist.test-support'

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

it('retains the spent use when its recipient account is deleted', async () => {
  const { member, other } = await waitingInvitation(harness)
  const code = await addInviteCode(harness)
  expect((await useCode(harness, member.session, code)).status).toBe(200)
  await harness.env.DB.prepare('DELETE FROM users WHERE id = ?')
    .bind(member.user.id)
    .run()
  expect(await uses(harness, code)).toBe(1)
  expect(
    await harness.env.DB.prepare(
      'SELECT code, user_id AS userId FROM access_code_uses',
    ).first(),
  ).toEqual({ code, userId: null })
  const response = await useCode(harness, other.session, code)
  expect(response.status).toBe(409)
  expect(await response.json()).toMatchObject({
    error: { code: 'invite_code_used_up' },
  })
  expect(await uses(harness, code)).toBe(1)
})
