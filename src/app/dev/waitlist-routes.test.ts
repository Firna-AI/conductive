import { describe, expect, test } from 'vitest'
import { API_PATHS } from '../../shared/api'
import {
  acceptOrgInvitePath,
  PENDING_ORG_INVITES_PATH,
} from '../../shared/members'
import { WAITLIST_PATHS } from '../../shared/waitlist'
import { FakeApiServer } from '../../test-support/fake-api'
import { FakeWorkspaceEvents } from '../../test-support/fake-events'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { sampleCodes } from '../../test-support/fixtures/waitlist'
import { maybeNested, record, text } from '../api/parse'
import { createBackend, guardScope } from './backend'
import { readDevOptions } from './options'
import { routeFetch } from './router'
import { seedState } from './seed'
import { waitlistRoutes } from './waitlist-routes'

/** The fetch of the dev fake with the options of a query string. */
function devFetch(search: string) {
  const backend = createBackend(
    seedState(readDevOptions(search)),
    new FakeWorkspaceEvents([]),
    () => FAKE_TIME,
    () => 'unused',
  )
  const fetch = routeFetch(
    waitlistRoutes(backend),
    (path, method) => guardScope(backend.state, path, method),
    new FakeApiServer().fetch,
  )
  /** The status, and the error code of a refusal, or `ok`. */
  const send = async (method: 'GET' | 'POST', path: string, body = {}) => {
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

describe('the waitlist of the dev fake', () => {
  test('checks a code as the Worker does, and a code that works gives app access with a new invite code', async () => {
    const { send } = devFetch('?waiting=1')
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
    expect({
      refusals,
      works: works.reply,
      access: session.reply.appAccess,
    }).toEqual({
      refusals: {
        unknown: '404 invite_code_not_found',
        disabled: '409 invite_code_disabled',
        usedUp: '409 invite_code_used_up',
      },
      works: {
        appAccess: true,
        signupsPaused: false,
        approvalEmail: 'sam@example.com',
        referralCode: {
          code: 'K7QHM-3XP2R',
          useLimit: 5,
          uses: 0,
          disabled: false,
        },
      },
      access: true,
    })
  })

  test('the pause refuses a code and the Accept of a person who waits, and the invitation stays for an Accept after the pause', async () => {
    const { backend, send } = devFetch('?waiting=1&invited=1&paused=1')
    const code = await send('POST', WAITLIST_PATHS.useCode, {
      code: sampleCodes.works.code,
    })
    const accept = await send('POST', acceptOrgInvitePath('invite-acme'))
    const invites = await send('GET', PENDING_ORG_INVITES_PATH)
    backend.state.waitlist.paused = false
    const after = await send('POST', acceptOrgInvitePath('invite-acme'))
    expect({
      code: `${code.status} ${code.result}`,
      accept: `${accept.status} ${accept.result}`,
      invites: invites.reply,
      after: after.reply,
      orgs: backend.state.orgs.map((org) => `${org.org.id} ${org.org.role}`),
      access: backend.state.waitlist.appAccess,
    }).toEqual({
      code: '403 signups_paused',
      accept: '403 signups_paused',
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
})
