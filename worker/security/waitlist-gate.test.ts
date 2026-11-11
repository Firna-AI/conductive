import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { agentLoginPath } from '../../src/shared/account'
import { API_PATHS, orgPath } from '../../src/shared/api'
import { workspaceEventsPath } from '../../src/shared/events'
import {
  PENDING_ORG_INVITES_PATH,
  acceptOrgInvitePath,
} from '../../src/shared/members'
import {
  operatorOverviewPath,
  userSuspensionPath,
} from '../../src/shared/operator'
import { terminalPaths } from '../../src/shared/terminal'
import { WAITLIST_PATHS } from '../../src/shared/waitlist'
import { write } from '../members/members-test-support'
import { streamedBody } from '../http/request-body.test-support'
import { fakeSite } from '../test-support/fake-site'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import {
  accessRecord,
  addInviteCode,
  sessionState,
  setPaused,
  setWaitlist,
  waitingInvitation,
  waitlistFixture,
} from '../waitlist/waitlist.test-support'
import {
  finishJoinSignIn,
  githubProfile,
} from './waitlist-sign-in.test-support'

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

it('creates a waiting account and keeps it waiting at its next GitHub sign-in', async () => {
  const session = await harness.login({ appAccess: false })
  const state = await sessionState(harness, session)
  expect(state.appAccess).toBe(false)
  expect(await accessRecord(harness, state.user.id)).toBeNull()
  expect(
    await (await harness.request(WAITLIST_PATHS.state, session)).json(),
  ).toEqual({
    appAccess: false,
    signupsPaused: false,
    waitlistOn: true,
    approvalEmail: null,
    referralCode: null,
  })
  const next = await harness.login({ appAccess: false })
  expect(await sessionState(harness, next)).toEqual(state)
})

it('keeps existing app access and its original grant at another sign-in', async () => {
  const { admin } = await waitlistFixture(harness)
  githubProfile(harness, admin.user)
  harness.setTime(TEST_TIME + 1000)
  const session = await harness.login({ appAccess: false })
  expect((await sessionState(harness, session)).appAccess).toBe(true)
  expect(await accessRecord(harness, admin.user.id)).toMatchObject({
    source: 'existing',
    grantedAt: TEST_TIME,
  })
  expect((await harness.request(API_PATHS.orgs, session)).status).toBe(200)
})

it('allows a waiting session to use a code and get app access without signing in again', async () => {
  const { member } = await waitlistFixture(harness)
  const response = await harness.request(
    WAITLIST_PATHS.useCode,
    member.session,
    write({ code: await addInviteCode(harness) }),
  )
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({ appAccess: true })
  expect((await harness.request(API_PATHS.orgs, member.session)).status).toBe(
    200,
  )
})

it('gives a waiting person open-sign-up access on their next request with the request time', async () => {
  const { admin, member, other } = await waitlistFixture(harness)
  await setWaitlist(harness, false, admin.user.id)
  harness.setTime(TEST_TIME + 1000)
  const response = await harness.request(API_PATHS.orgs, member.session)
  expect(response.status).toBe(200)
  expect(await accessRecord(harness, member.user.id)).toMatchObject({
    source: 'open_signup',
    grantedAt: TEST_TIME + 1000,
    operatorUserId: admin.user.id,
  })
  expect(await accessRecord(harness, other.user.id)).toBeNull()
  expect(
    await (await harness.request(WAITLIST_PATHS.state, member.session)).json(),
  ).toMatchObject({
    appAccess: true,
    waitlistOn: false,
  })
})

it('keeps a waiting request blocked while open sign-up is paused', async () => {
  const { admin, member } = await waitlistFixture(harness)
  await setWaitlist(harness, false, admin.user.id)
  await setPaused(harness)
  const response = await harness.request(API_PATHS.orgs, member.session)
  expect(response.status).toBe(403)
  expect(await response.json()).toMatchObject({
    error: { code: 'access_required' },
  })
  expect(await accessRecord(harness, member.user.id)).toBeNull()
})

it('allows only its own pending invitations and acceptance, then opens the org', async () => {
  const { org, invitation, member, other } = await waitingInvitation(harness)
  const listed = await harness.request(PENDING_ORG_INVITES_PATH, member.session)
  expect(listed.status).toBe(200)
  expect(await listed.json()).toEqual({
    invites: [{ ...invitation, orgId: org.id, orgName: org.name }],
  })
  const foreignList = await harness.request(
    PENDING_ORG_INVITES_PATH,
    other.session,
  )
  expect(await foreignList.json()).toEqual({ invites: [] })
  const foreign = await harness.request(
    acceptOrgInvitePath(invitation.id),
    other.session,
    write({}),
  )
  expect(foreign.status).toBe(404)
  expect(await foreign.json()).toMatchObject({
    error: { code: 'invite_not_found' },
  })
  const accepted = await harness.request(
    acceptOrgInvitePath(invitation.id),
    member.session,
    write({}),
  )
  expect(accepted.status).toBe(200)
  expect(await accepted.json()).toMatchObject({
    org: { id: org.id, role: 'member' },
  })
  expect((await sessionState(harness, member.session)).appAccess).toBe(true)
  expect((await harness.request(orgPath(org.id), member.session)).status).toBe(
    200,
  )
})

it('allows a waiting user to sign out and ends that session', async () => {
  const session = await harness.login({ appAccess: false })
  const response = await harness.request(API_PATHS.signOut, session, write({}))
  expect(response.status).toBe(204)
  expect((await harness.request(API_PATHS.session, session)).status).toBe(401)
})

it('refuses every protected request kind with access_required before dispatch or body reads', async () => {
  const { org, member } = await waitlistFixture(harness)
  harness.env.ASSETS = fakeSite()
  const socket = { headers: { Upgrade: 'websocket' } }
  const cases: readonly [string, RequestInit][] = [
    [API_PATHS.orgs, write({ name: 'Refused org' })],
    [
      agentLoginPath('codex'),
      write({ agent: 'codex', kind: 'api-key', secret: 'secret' }, 'PUT'),
    ],
    [orgPath(org.id), {}],
    [orgPath(org.id), write({ name: 'Refused rename' }, 'PATCH')],
    [orgPath('%').replace('%25', '%'), {}],
    [operatorOverviewPath(), {}],
    [userSuspensionPath(7), write({})],
    ['/api/unknown', {}],
    [API_PATHS.session, { method: 'HEAD' }],
    [WAITLIST_PATHS.state, write({})],
    [`${acceptOrgInvitePath('unknown')}/extra`, write({})],
    [API_PATHS.session, socket],
    ['/', socket],
    [workspaceEventsPath(org.id, 'missing-workspace'), socket],
    [terminalPaths.socket(org.id, 'missing-workspace'), socket],
    [terminalPaths.socket(org.id, '%').replace('%25', '%'), socket],
  ]
  for (const [path, init] of cases) {
    const response = await harness.request(path, member.session, init)
    expect(response.status, `${init.method ?? 'GET'} ${path}`).toBe(403)
    expect(await response.json()).toEqual({
      error: {
        code: 'access_required',
        message:
          'Your account is on the waitlist. Use an invite code to get access.',
      },
    })
  }
  const stream = streamedBody([new Uint8Array(1_000_001)])
  const init = { method: 'POST', body: stream.body, duplex: 'half' }
  const response = await harness.request(API_PATHS.orgs, member.session, init)
  expect(response.status).toBe(403)
  expect(await response.json()).toMatchObject({
    error: { code: 'access_required' },
  })
  expect(stream.observed.pulled).toBe(0)
  expect(harness.boat.requests).toHaveLength(0)
})

it('keeps a suspended waiting user out of sessions and GitHub sign-in', async () => {
  const session = await harness.login({ appAccess: false })
  const { user } = await sessionState(harness, session)
  await harness.env.DB.prepare('UPDATE users SET suspended_at = ? WHERE id = ?')
    .bind(TEST_TIME, user.id)
    .run()
  const refused = await harness.request(API_PATHS.session, session)
  expect(refused.status).toBe(401)
  expect(await refused.json()).toMatchObject({
    error: { code: 'sign_in_required' },
  })
  const signIn = await finishJoinSignIn(
    harness,
    (await harness.beginSignIn()).response,
  )
  expect(signIn.status).toBe(403)
  expect(await signIn.json()).toEqual({
    error: { code: 'user_suspended', message: 'This account is suspended.' },
  })
  expect(await accessRecord(harness, user.id)).toBeNull()
})
