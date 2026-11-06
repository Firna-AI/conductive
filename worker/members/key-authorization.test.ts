import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { boatKeyPath } from '../../src/shared/api'
import { readBoatKey } from '../data/boat-keys'
import { boatRoute } from '../sandbox/routes'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { keyRequest } from './maintenance-test-support'
import { changeMemberRole, removeOrgMember } from './membership'
import { memberFixture, membersClient, write } from './members-test-support'
import { testPause } from './test-pause'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness({ resetBoatAccounts: true })
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

it('refuses a key rotation after another admin removes its sender during the account check', async () => {
  const { org, admin, member } = await memberFixture(harness)
  const client = membersClient(harness)
  await changeMemberRole(
    harness.env.DB,
    org.id,
    admin.user.id,
    member.user.id,
    'admin',
  )
  expect(
    (
      await keyRequest(
        harness,
        client,
        boatKeyPath(org.id),
        admin.session,
        write({ key: 'boat-first' }, 'PUT'),
      )
    ).status,
  ).toBe(200)
  const stored = await readBoatKey(harness.env.DB, org.id)
  const pause = pauseAccountCheck(client)
  const saving = pause.start(() =>
    keyRequest(
      harness,
      client,
      boatKeyPath(org.id),
      admin.session,
      write({ key: 'boat-rotated' }, 'PUT'),
    ),
  )
  const operations: Promise<unknown>[] = [saving.operation]
  try {
    expect(await saving.outcome).toEqual({ type: 'paused' })
    const removing = pause.start(() =>
      removeOrgMember(
        harness.env.DB,
        org.id,
        member.user.id,
        admin.user.id,
        TEST_TIME,
      ),
    )
    operations.push(removing.operation)
    expect((await removing.outcome).type).toBe('completed')
    await removing.operation
    pause.release()
    const response = await saving.operation
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      error: { code: 'org_not_found', message: 'The org is not available.' },
    })
    expect(await readBoatKey(harness.env.DB, org.id)).toEqual(stored)
  } finally {
    pause.release()
    await Promise.allSettled(operations)
  }
})

it('refuses a first key save after another admin demotes its sender during the account check', async () => {
  const { org, admin, member } = await memberFixture(harness)
  const client = membersClient(harness)
  await changeMemberRole(
    harness.env.DB,
    org.id,
    admin.user.id,
    member.user.id,
    'admin',
  )
  expect(await readBoatKey(harness.env.DB, org.id)).toBeNull()
  const pause = pauseAccountCheck(client)
  const saving = pause.start(() =>
    keyRequest(
      harness,
      client,
      boatKeyPath(org.id),
      admin.session,
      write({ key: 'boat-first' }, 'PUT'),
    ),
  )
  const operations: Promise<unknown>[] = [saving.operation]
  try {
    expect(await saving.outcome).toEqual({ type: 'paused' })
    const demoting = pause.start(() =>
      changeMemberRole(
        harness.env.DB,
        org.id,
        member.user.id,
        admin.user.id,
        'member',
      ),
    )
    operations.push(demoting.operation)
    expect((await demoting.outcome).type).toBe('completed')
    await demoting.operation
    pause.release()
    const response = await saving.operation
    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      error: {
        code: 'admin_required',
        message: 'Ask an org admin to make this change.',
      },
    })
    expect(await readBoatKey(harness.env.DB, org.id)).toBeNull()
  } finally {
    pause.release()
    await Promise.allSettled(operations)
  }
})

function pauseAccountCheck(client: ReturnType<typeof membersClient>) {
  const pause = testPause()
  const fetch = client.dependencies.fetch
  client.dependencies.fetch = async (request) => {
    if (
      new URL(request.url).pathname.endsWith(
        boatRoute({ operation: 'account' }).path,
      )
    )
      await pause.wait()
    return fetch(request)
  }
  return pause
}
