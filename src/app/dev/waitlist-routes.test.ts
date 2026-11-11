import { describe, expect, test } from 'vitest'
import { API_PATHS } from '../../shared/api'
import {
  acceptOrgInvitePath,
  PENDING_ORG_INVITES_PATH,
} from '../../shared/members'
import { operatorUserPath } from '../../shared/operator'
import {
  operatorCodeDisablePath,
  operatorSignupPausePath,
  operatorWaitlistSwitchPath,
} from '../../shared/operator-waitlist'
import { WAITLIST_PATHS } from '../../shared/waitlist'
import { FakeApiServer } from '../../test-support/fake-api'
import { FakeWorkspaceEvents } from '../../test-support/fake-events'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { sampleOperator } from '../../test-support/fixtures/operator'
import { SAMPLE_IDS } from '../../test-support/fixtures/operator-samples'
import { sampleCodes, waitingUser } from '../../test-support/fixtures/waitlist'
import { maybeNested, record, text } from '../api/parse'
import { createBackend, guardScope } from './backend'
import { operatorRoutes } from './operator-routes'
import { readDevOptions } from './options'
import { routeFetch } from './router'
import { seedState } from './seed'
import { admitOpenSignup, waitlistRoutes } from './waitlist-routes'

/**
 * The fetch of the dev fake with the options of a query string. It serves
 * the waitlist and the operator section over one state, and lets a person
 * who waits in during open sign-up, as the dev fake of the app does.
 */
function devFetch(search: string) {
  const backend = createBackend(
    seedState(readDevOptions(search)),
    new FakeWorkspaceEvents([]),
    () => FAKE_TIME,
    () => 'unused',
  )
  const fetch = routeFetch(
    [...waitlistRoutes(backend), ...operatorRoutes(backend)],
    (path, method) => {
      admitOpenSignup(backend)
      guardScope(backend.state, path, method)
    },
    new FakeApiServer().fetch,
  )
  /** The status, and the error code of a refusal, or `ok`. */
  const send = async (
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    body = {},
  ) => {
    const response = await fetch(path, {
      method,
      body: method === 'GET' ? undefined : JSON.stringify(body),
    })
    const reply = record(await response.json())
    const error = maybeNested(reply, 'error', (value) =>
      text(record(value), 'code'),
    )
    return { status: response.status, result: error ?? 'ok', reply }
  }
  return { backend, send }
}

/** The characters of a code that the app makes, in two groups of five. */
const CODE_FORMAT = /^[2-9A-HJKMNP-TV-Z]{5}-[2-9A-HJKMNP-TV-Z]{5}$/

describe('the waitlist of the dev fake', () => {
  test('checks a code of the operator section as the Worker does, and a code that works counts its use there and gives app access with a new referral code', async () => {
    const { backend, send } = devFetch('?waiting=1')
    const { codes } = backend.state.operator
    const codesBefore = new Set(codes.keys())
    const use = async (code: string) => {
      const { status, result } = await send('POST', WAITLIST_PATHS.useCode, {
        code,
      })
      return `${status} ${result}`
    }
    const refusals = {
      unknown: await use('ZZZZZ-ZZZZZ'),
      disabled: await use(sampleCodes.disabled.code),
      usedUp: await use(sampleCodes.usedUp.code),
    }
    const works = await send('POST', WAITLIST_PATHS.useCode, {
      code: sampleCodes.works.code.replace('-', '').toLowerCase(),
    })
    const session = await send('GET', API_PATHS.session)
    const own = [...codes.values()].filter(
      (code) => code.owner?.githubId === waitingUser.githubId,
    )
    const made = own[0]?.code ?? ''
    expect({
      refusals,
      works: works.reply,
      access: session.reply.appAccess,
      own,
      format: CODE_FORMAT.test(made),
      new: !codesBefore.has(made),
      used: codes.get(sampleCodes.works.code)?.uses,
    }).toEqual({
      refusals: {
        unknown: '404 invite_code_not_found',
        disabled: '409 invite_code_disabled',
        usedUp: '409 invite_code_used_up',
      },
      works: {
        appAccess: true,
        signupsPaused: false,
        waitlistOn: true,
        approvalEmail: 'sam@example.com',
        referralCode: { code: made, useLimit: 5, uses: 0, disabled: false },
      },
      access: true,
      own: [
        {
          code: made,
          kind: 'referral',
          label: null,
          owner: { githubId: waitingUser.githubId, login: 'sam-okafor' },
          createdBy: null,
          createdAt: FAKE_TIME,
          useLimit: 5,
          uses: 0,
          disabledAt: null,
          disabledBy: null,
        },
      ],
      format: true,
      new: true,
      used: 13,
    })
  })

  test('the pause refuses a code and the Accept of a person who waits, uses up nothing, and the invitation stays for an Accept after the pause', async () => {
    const { backend, send } = devFetch('?waiting=1&invited=1&paused=1')
    const records = backend.state.operator
    const code = await send('POST', WAITLIST_PATHS.useCode, {
      code: sampleCodes.works.code,
    })
    const accept = await send('POST', acceptOrgInvitePath('invite-acme'))
    const invites = await send('GET', PENDING_ORG_INVITES_PATH)
    // An operator resumes sign-ups in the operator section.
    records.pause = {
      paused: false,
      updatedAt: FAKE_TIME,
      operator: sampleOperator,
    }
    const after = await send('POST', acceptOrgInvitePath('invite-acme'))
    expect({
      code: `${code.status} ${code.result}`,
      accept: `${accept.status} ${accept.result}`,
      uses: records.codes.get(sampleCodes.works.code)?.uses,
      invites: invites.reply,
      after: after.reply,
      orgs: backend.state.orgs.map((org) => `${org.org.id} ${org.org.role}`),
      access: backend.state.waitlist.appAccess,
    }).toEqual({
      code: '403 signups_paused',
      accept: '403 signups_paused',
      uses: 12,
      invites: {
        invites: [
          {
            id: 'invite-acme',
            email: 'sam@example.com',
            createdAt: FAKE_TIME - 3_600_000,
            orgId: 'acme',
            orgName: 'Acme',
          },
        ],
      },
      after: {
        org: { id: 'acme', name: 'Acme', initials: 'AC', role: 'member' },
      },
      orgs: ['acme member'],
      access: true,
    })
  })

  test('a pause, a disable, a resume, and the waitlist switch in the operator section show in the waitlist state of the operator, which the Account page reads', async () => {
    const { send } = devFetch('?operator=1')
    const state = async () => (await send('GET', WAITLIST_PATHS.state)).reply
    const before = await state()
    await send('POST', operatorSignupPausePath())
    const paused = await state()
    await send('POST', operatorCodeDisablePath('K7QHM-3XP2R'))
    const disabled = await state()
    await send('DELETE', operatorSignupPausePath())
    const resumed = await state()
    await send('DELETE', operatorWaitlistSwitchPath())
    const off = await state()
    await send('POST', operatorWaitlistSwitchPath())
    const on = await state()
    const code = { code: 'K7QHM-3XP2R', useLimit: 5, uses: 0 }
    const of = (
      signupsPaused: boolean,
      disabled: boolean,
      waitlistOn = true,
    ) => ({
      appAccess: true,
      signupsPaused,
      waitlistOn,
      approvalEmail: null,
      referralCode: { ...code, disabled },
    })
    expect({ before, paused, disabled, resumed, off, on }).toEqual({
      before: of(false, false),
      paused: of(true, false),
      disabled: of(true, true),
      resumed: of(false, true),
      off: of(false, true, false),
      on: of(false, true),
    })
  })

  test('waitlist=off lets a person who waits in at the next request with a new referral code and no use of a code, and the pause keeps them waiting until it ends', async () => {
    const { backend, send } = devFetch('?waiting=1&waitlist=off&paused=1')
    const records = backend.state.operator
    const uses = () =>
      [...records.codes.values()].map((code) => `${code.code} ${code.uses}`)
    const usesBefore = uses()
    const paused = await send('GET', WAITLIST_PATHS.state)
    // An operator resumes sign-ups in the operator section.
    records.pause = {
      paused: false,
      updatedAt: FAKE_TIME,
      operator: sampleOperator,
    }
    const session = await send('GET', API_PATHS.session)
    const own = [...records.codes.values()].filter(
      (code) => code.owner?.githubId === waitingUser.githubId,
    )
    expect({
      paused: paused.reply,
      access: session.reply.appAccess,
      own: own.map((code) => `${code.kind} ${code.uses} of ${code.useLimit}`),
      uses: uses().filter((line) => !line.startsWith(own[0]?.code ?? '-')),
    }).toEqual({
      paused: {
        appAccess: false,
        signupsPaused: true,
        waitlistOn: false,
        approvalEmail: 'sam@example.com',
        referralCode: null,
      },
      access: true,
      own: ['referral 0 of 5'],
      uses: usesBefore,
    })
  })

  test('paused=1 and inviteCode set the pause and the referral code that the operator section shows', async () => {
    const cases = [
      ['used-up', { uses: 5, state: 'used_up', disabledAt: null }, false],
      ['disabled', { uses: 0, state: 'disabled', disabledAt: FAKE_TIME }, true],
    ] as const
    for (const [option, code, disabled] of cases) {
      const { send } = devFetch(`?operator=1&paused=1&inviteCode=${option}`)
      const pause = await send('GET', operatorSignupPausePath())
      const page = await send('GET', operatorUserPath(SAMPLE_IDS.self))
      const state = await send('GET', WAITLIST_PATHS.state)
      expect(
        { pause: pause.reply, page: page.reply, state: state.reply },
        option,
      ).toMatchObject({
        pause: { paused: true, updatedAt: FAKE_TIME, operator: sampleOperator },
        page: { referralCode: { code: 'K7QHM-3XP2R', useLimit: 5, ...code } },
        state: {
          signupsPaused: true,
          waitlistOn: true,
          referralCode: { code: 'K7QHM-3XP2R', uses: code.uses, disabled },
        },
      })
    }
  })
})
