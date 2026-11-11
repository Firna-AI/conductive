import { API_PATHS } from '../../src/shared/api'
import type { SessionResponse } from '../../src/shared/account'
import { WAITLIST_PATHS } from '../../src/shared/waitlist'
import { memberFixture, write } from '../members/members-test-support'
import { inviteOrgMember } from '../members/invites'
import { TEST_TIME, type TestHarness } from '../test-support/harness'
import { grantAppAccess } from './grant'

export async function waitlistFixture(harness: TestHarness) {
  const fixture = await memberFixture(harness, { appAccess: false })
  await grantAppAccess(
    harness.env.DB,
    fixture.admin.user.id,
    { source: 'existing' },
    TEST_TIME,
  )
  return fixture
}

export async function addInviteCode(
  harness: TestHarness,
  code = 'K7QHM3XP2R',
  useLimit = 1,
) {
  await harness.env.DB.prepare(
    `INSERT INTO access_codes (code, kind, label, use_limit, created_at)
     VALUES (?, 'invite', 'Test invitation', ?, ?)`,
  )
    .bind(code, useLimit, TEST_TIME)
    .run()
  return code
}

export async function setPaused(harness: TestHarness, paused = true) {
  await harness.env.DB.prepare(
    'UPDATE signup_settings SET paused = ?, updated_at = ? WHERE id = 1',
  )
    .bind(paused ? 1 : 0, TEST_TIME)
    .run()
}

export async function setWaitlist(
  harness: TestHarness,
  waitlistOn: boolean,
  operatorId: string,
) {
  await harness.env.DB.prepare(
    `UPDATE signup_settings SET waitlist_on = ?, waitlist_updated_at = ?,
     waitlist_updated_by_user_id = ? WHERE id = 1`,
  )
    .bind(waitlistOn ? 1 : 0, TEST_TIME, operatorId)
    .run()
}

export function useCode(harness: TestHarness, session: string, code: string) {
  return harness.request(WAITLIST_PATHS.useCode, session, write({ code }))
}

export function accessRecord(harness: TestHarness, userId: string) {
  return harness.env.DB.prepare(
    `SELECT granted_at AS grantedAt, source, code, operator_user_id AS operatorUserId,
      org_id AS orgId, invitation_id AS invitationId, invited_by_user_id AS invitedByUserId
     FROM user_app_access WHERE user_id = ?`,
  )
    .bind(userId)
    .first()
}

export function uses(harness: TestHarness, code?: string) {
  return harness.env.DB.prepare(
    `SELECT COUNT(*) AS count FROM access_code_uses${code ? ' WHERE code = ?' : ''}`,
  )
    .bind(...(code ? [code] : []))
    .first<number>('count')
}

export async function sessionState(harness: TestHarness, session: string) {
  const response = await harness.request(API_PATHS.session, session)
  if (response.status !== 200)
    throw new Error(`Session returned ${response.status}`)
  const state: SessionResponse = await response.json()
  return state
}

export async function waitingInvitation(harness: TestHarness) {
  const fixture = await waitlistFixture(harness)
  await harness.env.DB.prepare(
    'DELETE FROM org_members WHERE org_id = ? AND user_id IN (?, ?)',
  )
    .bind(fixture.org.id, fixture.member.user.id, fixture.other.user.id)
    .run()
  const invitation = await inviteOrgMember(
    harness.env.DB,
    fixture.org.id,
    fixture.admin.user.id,
    'waitlist-org-invite',
    'member@example.com',
    TEST_TIME,
  )
  return { ...fixture, invitation }
}
