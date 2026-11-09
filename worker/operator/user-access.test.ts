import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  operatorUserPath,
  operatorUsersPath,
  type OperatorUserDetail,
  type OperatorUsersResponse,
} from '../../src/shared/operator'
import { operatorCodeDisablePath } from '../../src/shared/operator-waitlist'
import { acceptOrgInvitePath } from '../../src/shared/members'
import { WAITLIST_PATHS } from '../../src/shared/waitlist'
import { inviteOrgMember } from '../members/invites'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { grantAppAccess } from '../waitlist/grant'
import { readWaitlistState } from '../waitlist/data'
import { addInviteCode } from '../waitlist/waitlist.test-support'
import { operatorWaitlistFixture, operatorWrite } from './waitlist.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => harness.dispose())

it('shows invite labels and referral owners with the referral recipients in the detail and list', async () => {
  const client = await operatorWaitlistFixture(harness)
  const invite = await addInviteCode(harness)
  const joined = await client.request(
    WAITLIST_PATHS.useCode,
    client.member.session,
    operatorWrite({ code: invite }),
  )
  expect(joined.status).toBe(200)
  const referral =
    (await readWaitlistState(harness.env.DB, client.member.user.id))
      .referralCode?.code ?? ''
  const referred = await client.request(
    WAITLIST_PATHS.useCode,
    client.other.session,
    operatorWrite({ code: referral }),
  )
  expect(referred.status).toBe(200)
  const disabled = await client.request(
    operatorCodeDisablePath(referral),
    undefined,
    operatorWrite(),
  )
  expect(disabled.status).toBe(200)
  const response = await client.request(operatorUserPath(11))
  expect(response.status).toBe(200)
  const detail: OperatorUserDetail = await response.json()
  expect(detail).toMatchObject({
    appAccess: {
      state: 'granted',
      grantedAt: TEST_TIME,
      source: {
        kind: 'invite_code',
        code: 'K7QHM-3XP2R',
        label: 'Test invitation',
      },
    },
    referralCode: {
      code: referral,
      useLimit: 5,
      uses: 1,
      state: 'disabled',
      disabledAt: TEST_TIME,
      disabledBy: { githubId: 10, login: 'admin' },
      recipients: [{ githubId: 12, login: 'other', usedAt: TEST_TIME }],
    },
    approvalEmail: { state: 'none', updatedAt: null },
  })
  const recipient = await client.request(operatorUserPath(12))
  expect(recipient.status).toBe(200)
  expect(await recipient.json()).toMatchObject({
    appAccess: {
      state: 'granted',
      grantedAt: TEST_TIME,
      source: {
        kind: 'referral_code',
        code: referral,
        owner: { githubId: 11, login: 'member' },
      },
    },
  })
  const users = await client.request(operatorUsersPath({ q: 'member' }))
  expect(users.status).toBe(200)
  const list: OperatorUsersResponse = await users.json()
  expect(list.users[0].appAccess).toEqual(detail.appAccess)
  expect(list.users[0].referralCode).toEqual(detail.referralCode)
  expect(JSON.stringify([detail, list])).not.toContain('@')
})

it('shows the org and inviting admin after acceptance and the operator and existing sources', async () => {
  const client = await operatorWaitlistFixture(harness)
  await harness.env.DB.prepare('DELETE FROM org_members WHERE user_id = ?')
    .bind(client.member.user.id)
    .run()
  const invite = await inviteOrgMember(
    harness.env.DB,
    client.org.id,
    client.admin.user.id,
    'source-invite',
    'member@example.com',
    TEST_TIME,
  )
  const accepted = await client.request(
    acceptOrgInvitePath(invite.id),
    client.member.session,
    operatorWrite(),
  )
  expect(accepted.status).toBe(200)
  const user = await client.request(operatorUserPath(11))
  expect(user.status).toBe(200)
  expect(await user.json()).toMatchObject({
    appAccess: {
      state: 'granted',
      grantedAt: TEST_TIME,
      source: {
        kind: 'org_invitation',
        org: { id: client.org.id, name: 'Members org' },
        invitedBy: { githubId: 10, login: 'admin' },
      },
    },
  })
  expect(
    await harness.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM org_invites',
    ).first('count'),
  ).toBe(0)
  await grantAppAccess(
    harness.env.DB,
    client.other.user.id,
    { source: 'operator' },
    TEST_TIME,
  )
  for (const [id, kind] of [
    [10, 'existing'],
    [12, 'operator'],
  ] as const) {
    const response = await client.request(operatorUserPath(id))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      appAccess: { state: 'granted', grantedAt: TEST_TIME, source: { kind } },
      referralCode: { useLimit: 5 },
    })
  }
})
