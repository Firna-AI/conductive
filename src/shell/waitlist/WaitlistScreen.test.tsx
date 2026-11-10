// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { ManualDelay, ManualFocus, requestLines } from '../../app/test-kit'
import { API_PATHS } from '../../shared/api'
import {
  acceptOrgInvitePath,
  PENDING_ORG_INVITES_PATH,
  type PendingOrgInvite,
} from '../../shared/members'
import { WAITLIST_PATHS } from '../../shared/waitlist'
import { byLabel, byRole, queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { waitingState } from '../../test-support/fixtures/waitlist'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  press,
  typeText,
  waitFor,
} from '../../test-support/mount'
import { codeRefusal, serveWaiting } from '../../test-support/waitlist'
import { settle } from '../test-mount'
import { cardText, openApp, serveNewAccount } from './waitlist-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const title = "You're on the waitlist"

/** The foot of the card: the GitHub account of Sam, and Sign out. */
const account = 'SO Sam Okafor @sam-okafor Sign out'

const acme: PendingOrgInvite = {
  id: 'invite-acme',
  email: 'sam@example.com',
  createdAt: FAKE_TIME - 3_600_000,
  orgId: 'acme',
  orgName: 'Acme',
}

function waitlistShown(view: HTMLElement) {
  return waitFor(() => queryByRole('region', title, view), 'the waitlist')
}

/** Types a code into the field and presses Use code. */
async function submitCode(view: HTMLElement, code: string) {
  await typeText(byLabel('Invite code', view), code)
  await press(byRole('button', 'Use code', view))
}

describe('the waitlist screen', () => {
  test('a person who waits sees only the waitlist, also at the operator section, with the address of the approval email or no promise of one', async () => {
    holdAnimationFrames()
    const cases = [
      [
        'verified',
        "You'll get an email at sam@example.com when you're approved.",
      ],
      ['none', "Conductive opens here once you're approved."],
    ] as const
    for (const [email, line] of cases) {
      const server = new FakeApiServer()
      serveWaiting(server, { email })
      const { view } = openApp(server, routes.operator())
      await waitlistShown(view)
      await waitFor(
        () => requestLines(server).length === 3,
        'the reads of the waitlist',
      )
      expect({
        card: cardText(view, title),
        requests: requestLines(server),
      }).toEqual({
        card: `${title} ${line} Invite code Use code ${account}`,
        requests: [
          `GET ${API_PATHS.session}`,
          `GET ${WAITLIST_PATHS.state}`,
          `GET ${PENDING_ORG_INVITES_PATH}`,
        ],
      })
    }
  })

  test('Sign out ends the session and shows the sign-in', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    serveWaiting(server)
    const { view } = openApp(server, routes.home())
    await waitlistShown(view)
    await press(byRole('button', 'Sign out', view))
    await waitFor(
      () => queryByRole('region', 'Sign in to Conductive', view),
      'the sign-in',
    )
    expect(requestLines(server)).toContain(`POST ${API_PATHS.signOut}`)
  })

  test('a typed code that does not work names its reason and keeps its text, and the pause shows above the field', async () => {
    holdAnimationFrames()
    const cases = [
      [
        'invite_code_not_found',
        "Invite code Use code That code wasn't found. Check it and try again.",
      ],
      [
        'invite_code_disabled',
        'Invite code Use code That code no longer works. Ask for another one.',
      ],
      [
        'invite_code_used_up',
        'Invite code Use code That code is used up. Ask for another one.',
      ],
      [
        'signups_paused',
        'Sign-ups are paused Try your code again later. It stays unused. Invite code Use code',
      ],
    ] as const
    for (const [refusal, field] of cases) {
      const server = new FakeApiServer()
      serveWaiting(server)
      const reply = codeRefusal(refusal)
      server.json('POST', WAITLIST_PATHS.useCode, reply.body, reply.status)
      const { view } = openApp(server, routes.home())
      await waitlistShown(view)
      await submitCode(view, 'hn4px-7crt9')
      const line =
        "You'll get an email at sam@example.com when you're approved."
      await waitFor(
        () =>
          cardText(view, title) !==
          `${title} ${line} Invite code Use code ${account}`,
        `the reason of ${refusal}`,
      )
      expect(
        {
          card: cardText(view, title),
          typed: (byLabel('Invite code', view) as HTMLInputElement).value,
        },
        refusal,
      ).toEqual({
        card: `${title} ${line} ${field} ${account}`,
        typed: 'hn4px-7crt9',
      })
    }
  })

  test('a code that works opens Get started for the new account', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    serveWaiting(server)
    server.json('POST', WAITLIST_PATHS.useCode, {
      ...waitingState,
      appAccess: true,
    })
    serveNewAccount(server)
    const { navigation, view } = openApp(server, routes.home())
    await waitlistShown(view)
    await submitCode(view, 'V7MKC-2QDXH')
    await waitFor(
      () => navigation.href() === routes.getStarted(),
      'Get started',
    )
    const use = server.requests.find(
      (request) => new URL(request.url).pathname === WAITLIST_PATHS.useCode,
    )
    expect(await use?.json()).toEqual({ code: 'V7MKC-2QDXH' })
  })

  test('during the pause, Accept keeps the invitation and names the pause', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    serveWaiting(server)
    server.json('GET', PENDING_ORG_INVITES_PATH, { invites: [acme] })
    const paused = codeRefusal('signups_paused')
    server.json(
      'POST',
      acceptOrgInvitePath(acme.id),
      paused.body,
      paused.status,
    )
    const { navigation, view } = openApp(server, routes.home())
    await waitlistShown(view)
    await press(byRole('button', 'Accept the invitation to Acme', view))
    await waitFor(
      () => cardText(view, title).includes('Sign-ups are paused'),
      'the notice of the pause',
    )
    expect({ card: cardText(view, title), at: navigation.href() }).toEqual({
      card: `${title} You'll get an email at sam@example.com when you're approved. Accept an invitation to join its org and skip the waitlist. Sign-ups are paused Your invitation stays. Accept it again when sign-ups resume. Acme Sent to sam@example.com Accept invitation Invite code Use code ${account}`,
      at: routes.home(),
    })
  })

  test('Accept joins the org, reads the app access again, and opens the org', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    serveWaiting(server)
    server.json('GET', PENDING_ORG_INVITES_PATH, { invites: [acme] })
    const org = { id: 'acme', name: 'Acme', initials: 'AC', role: 'member' }
    server.json('POST', acceptOrgInvitePath(acme.id), { org })
    const { app, navigation, view } = openApp(server, routes.home())
    await waitlistShown(view)
    server.json('GET', WAITLIST_PATHS.state, {
      ...waitingState,
      appAccess: true,
    })
    server.json('GET', API_PATHS.orgs, { orgs: [org] })
    const before = requestLines(server).length
    await press(byRole('button', 'Accept the invitation to Acme', view))
    await waitFor(() => app.boot.get().state === 'ready', 'the open app')
    expect({
      at: navigation.href(),
      requests: requestLines(server).slice(before, before + 2),
    }).toEqual({
      at: routes.org('acme'),
      requests: [
        `POST ${acceptOrgInvitePath(acme.id)}`,
        `GET ${WAITLIST_PATHS.state}`,
      ],
    })
  })

  test('the app reads the app access again when the person comes back, with no timer, and opens as usual after an approval', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    serveWaiting(server)
    const focus = new ManualFocus()
    const delay = new ManualDelay()
    const { navigation, view } = openApp(server, routes.home(), {
      onFocus: focus.onFocus,
      delay: delay.delay,
    })
    await waitlistShown(view)
    const before = requestLines(server).length
    focus.focus()
    await waitFor(
      () => requestLines(server).length === before + 2,
      'the reads at the return',
    )
    await settle()
    expect({
      timers: delay.pending,
      reads: requestLines(server).slice(before).sort(),
      at: navigation.href(),
    }).toEqual({
      timers: 0,
      reads: [`GET ${PENDING_ORG_INVITES_PATH}`, `GET ${WAITLIST_PATHS.state}`],
      at: routes.home(),
    })
    // An operator approves Sam while Sam is away.
    server.json('GET', WAITLIST_PATHS.state, {
      ...waitingState,
      appAccess: true,
    })
    serveNewAccount(server)
    focus.focus()
    await waitFor(
      () => navigation.href() === routes.getStarted(),
      'Get started',
    )
  })
})
