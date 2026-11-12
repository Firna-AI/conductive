import { describe, expect, test } from 'vitest'
import {
  operatorOrgPath,
  operatorOrgsPath,
  operatorOverviewPath,
  operatorUserPath,
  orgSuspensionPath,
} from '../../shared/operator'
import {
  operatorApprovalPath,
  operatorCodeDisablePath,
  operatorCodesPath,
  operatorSignupPausePath,
  operatorWaitlistPath,
  operatorWaitlistSwitchPath,
} from '../../shared/operator-waitlist'
import { operatorProvidersPath } from '../../shared/operator-providers'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { sampleOperator } from '../../test-support/fixtures/operator'
import { SAMPLE_IDS } from '../../test-support/fixtures/operator-samples'
import { readAccessCode, readWaitlistPage } from '../api/read-operator-waitlist'
import { devFetch } from './dev-test-kit'

describe('the operator routes of the dev fake', () => {
  test('answer only an operator, as the Worker does', async () => {
    const { send } = devFetch('')
    const refused = {
      status: 403,
      body: {
        error: {
          code: 'operator_required',
          message: 'Operator access is required.',
        },
      },
    }
    expect({
      overview: await send('GET', operatorOverviewPath()),
      providers: await send('GET', operatorProvidersPath()),
    }).toEqual({ overview: refused, providers: refused })
  })

  test('find an org by a preview address, and suspend and lift it with the time and the operator', async () => {
    const { backend, send } = devFetch('?operator=1')
    const address = 'https://k7q2m9fz.conductive.page/checkout'
    const found = await send('GET', operatorOrgsPath({ q: address }))
    const id = SAMPLE_IDS.activeOrg
    const suspended = await send('POST', orgSuspensionPath(id))
    const page = await send('GET', operatorOrgPath(id))
    const lifted = await send('DELETE', orgSuspensionPath(id))
    const repeat = await send('DELETE', orgSuspensionPath(id))
    await send('POST', orgSuspensionPath(FAKE_IDS.org))
    const acme = backend.state.orgs.find((org) => org.org.id === FAKE_IDS.org)
    expect({
      found: found.body,
      suspended,
      page: page.body,
      lifted: lifted.body,
      repeat: repeat.body,
      acme: acme?.org.suspension,
    }).toMatchObject({
      found: {
        orgs: [{ id: SAMPLE_IDS.suspendedOrg, match: 'preview-address' }],
        total: 1,
        nextCursor: null,
      },
      suspended: {
        status: 202,
        body: {
          orgId: id,
          suspendedAt: FAKE_TIME + 60_000,
          pendingWorkspaceIds: [
            `${id}-workspace-1`,
            `${id}-workspace-2`,
            `${id}-workspace-3`,
            `${id}-workspace-4`,
          ],
          pendingBuildIds: [`${id}-build-1`, `${id}-build-2`],
        },
      },
      page: {
        suspension: {
          suspendedAt: FAKE_TIME + 60_000,
          operator: { githubId: 1, login: 'calummoore' },
        },
      },
      lifted: { orgId: id, liftedAt: FAKE_TIME + 60_000 },
      repeat: { orgId: id, liftedAt: null },
      acme: { suspendedAt: FAKE_TIME + 60_000 },
    })
  })

  test('approve a person who waits, who leaves the waitlist with a referral code, make and disable a code, pause sign-ups, and turn the waitlist off and on, as the Worker does', async () => {
    const { send } = devFetch('?operator=1')
    const sam = SAMPLE_IDS.waitingUser
    const approved = await send('POST', operatorApprovalPath(sam))
    const repeat = await send('POST', operatorApprovalPath(sam))
    const suspended = await send(
      'POST',
      operatorApprovalPath(SAMPLE_IDS.suspendedUser),
    )
    const waitlist = await send('GET', operatorWaitlistPath())
    const page = await send('GET', operatorUserPath(sam))
    const made = await send('POST', operatorCodesPath(), {
      label: ' Meetup Porto ',
      useLimit: 40,
    })
    const refused = await send('POST', operatorCodesPath(), {
      label: ' ',
      useLimit: 0,
    })
    const { code } = readAccessCode(made.body)
    const found = await send('GET', operatorCodesPath({ q: 'meetup' }))
    const disabled = await send('POST', operatorCodeDisablePath(code))
    const paused = await send('POST', operatorSignupPausePath())
    const resumed = await send('DELETE', operatorSignupPausePath())
    const off = await send('DELETE', operatorWaitlistSwitchPath())
    const on = await send('POST', operatorWaitlistSwitchPath())
    expect({
      approved,
      repeat: repeat.body,
      suspended: suspended.status,
      waitlist: readWaitlistPage(waitlist.body).rows.map((row) => row.login),
      page: page.body,
      made,
      refused: refused.status,
      found: found.body,
      disabled: disabled.body,
      paused: paused.body,
      resumed: resumed.body,
      off: off.body,
      on: on.body,
    }).toMatchObject({
      approved: {
        status: 200,
        body: {
          githubId: sam,
          changed: true,
          approvalEmail: { state: 'pending', updatedAt: FAKE_TIME + 60_000 },
          emailFailed: true,
        },
      },
      repeat: { changed: false, emailFailed: false },
      suspended: 409,
      waitlist: [
        'jules-m',
        'pkwan',
        'kenji-w',
        'nadia-q',
        'ovi-dev',
        'lena-h',
        'samir-h',
        'bram-v',
        'zed-k',
      ],
      page: {
        appAccess: {
          state: 'granted',
          grantedAt: FAKE_TIME + 60_000,
          source: { kind: 'approval', operator: { login: 'calummoore' } },
        },
        referralCode: { kind: 'referral', uses: 0, state: 'active' },
      },
      made: {
        status: 201,
        body: { kind: 'invite', label: 'Meetup Porto', useLimit: 40 },
      },
      refused: 400,
      found: {
        total: 2,
        codes: [{ label: 'Meetup Porto' }, { label: 'Meetup Lisbon' }],
      },
      disabled: { code, state: 'disabled', disabledAt: FAKE_TIME + 60_000 },
      paused: { paused: true, operator: { login: 'calummoore' } },
      resumed: { paused: false },
      off: {
        waitlistOn: false,
        updatedAt: FAKE_TIME + 60_000,
        operator: { login: 'calummoore' },
        waiting: 9,
      },
      on: { waitlistOn: true },
    })
  })

  test('waitlist=off shows the switch off by the operator of the samples, and Zed K, who came back, with the source open sign-up and a referral code', async () => {
    const { send } = devFetch('?operator=1&waitlist=off')
    const zed = SAMPLE_IDS.newestWaiting
    const waitlistSwitch = await send('GET', operatorWaitlistSwitchPath())
    const waitlist = await send('GET', operatorWaitlistPath())
    const page = await send('GET', operatorUserPath(zed))
    expect({
      waitlistSwitch: waitlistSwitch.body,
      waiting: readWaitlistPage(waitlist.body).rows.map((row) => row.login),
      page: page.body,
    }).toMatchObject({
      waitlistSwitch: {
        waitlistOn: false,
        updatedAt: FAKE_TIME - 90 * 60_000,
        operator: sampleOperator,
        waiting: 9,
      },
      waiting: [
        'sam-okafor',
        'jules-m',
        'pkwan',
        'kenji-w',
        'nadia-q',
        'ovi-dev',
        'lena-h',
        'samir-h',
        'bram-v',
      ],
      page: {
        login: 'zed-k',
        appAccess: {
          state: 'granted',
          grantedAt: FAKE_TIME - 60 * 60_000,
          source: { kind: 'open_signup', operator: sampleOperator },
        },
        approvalEmail: { state: 'none' },
        referralCode: { kind: 'referral', uses: 0, state: 'active' },
      },
    })
  })
})
