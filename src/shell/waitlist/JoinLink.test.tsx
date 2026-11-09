// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { requestLines } from '../../app/test-kit'
import { API_PATHS } from '../../shared/api'
import { acceptedTermsSignInPath } from '../../shared/terms'
import {
  INVITE_CODE_ERROR_PARAMETER,
  joinPath,
  WAITLIST_PATHS,
} from '../../shared/waitlist'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { waitingState } from '../../test-support/fixtures/waitlist'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  press,
  waitFor,
} from '../../test-support/mount'
import { codeRefusal, serveWaiting } from '../../test-support/waitlist'
import { cardText, openApp, serveNewAccount } from './waitlist-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const code = 'W9TFC-4MJ6D'
const waitlist = "You're on the waitlist"
const email = "You'll get an email at sam@example.com when you're approved."
const field = 'Invite code Use code SO Sam Okafor @sam-okafor Sign out'

/** Each use of a code that the app sent. */
function codeUses(server: FakeApiServer): string[] {
  return requestLines(server).filter(
    (line) => line === `POST ${WAITLIST_PATHS.useCode}`,
  )
}

describe('the join link', () => {
  test('a visitor who is not signed in sees the sign-in with the code of the link, and Continue with GitHub carries the code', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    server.json(
      'GET',
      API_PATHS.session,
      { error: { code: 'unauthorized', message: 'Sign in to continue.' } },
      401,
    )
    const left: string[] = []
    const { view } = openApp(server, joinPath(code), {
      leave: (url) => left.push(url),
    })
    const title = 'Sign in to Conductive'
    await waitFor(() => queryByRole('region', title, view), 'the sign-in')
    expect(cardText(view, title)).toContain(
      `Your invite code comes with this link ${code} By continuing`,
    )
    await press(byRole('button', 'Continue with GitHub', view))
    expect(left).toEqual([acceptedTermsSignInPath(code)])
  })

  test('a person who waits uses the code of the link at once, and a code that works opens Get started', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    serveWaiting(server)
    server.json('POST', WAITLIST_PATHS.useCode, {
      ...waitingState,
      appAccess: true,
    })
    serveNewAccount(server)
    const { navigation } = openApp(server, joinPath(code))
    await waitFor(
      () => navigation.href() === routes.getStarted(),
      'Get started',
    )
    const use = server.requests.find(
      (request) => new URL(request.url).pathname === WAITLIST_PATHS.useCode,
    )
    expect(await use?.json()).toEqual({ code })
  })

  test('a code of the link that does not work opens the waitlist at the address of the app, with the notice of its reason', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    serveWaiting(server)
    const usedUp = codeRefusal('invite_code_used_up')
    server.json('POST', WAITLIST_PATHS.useCode, usedUp.body, usedUp.status)
    const { navigation, view } = openApp(server, joinPath(code))
    await waitFor(() => queryByRole('region', waitlist, view), 'the waitlist')
    expect({
      card: cardText(view, waitlist),
      at: navigation.href(),
      uses: codeUses(server).length,
    }).toEqual({
      card: `${waitlist} ${email} Your invite link is used up Ask for another invite. ${field}`,
      at: routes.home(),
      uses: 1,
    })
  })

  test('a code that did not work at the sign-in shows its reason, and the app uses it no more', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    serveWaiting(server)
    const failed = `${joinPath(code)}?${INVITE_CODE_ERROR_PARAMETER}=signups_paused`
    const { navigation, view } = openApp(server, failed)
    await waitFor(() => queryByRole('region', waitlist, view), 'the waitlist')
    expect({
      card: cardText(view, waitlist),
      at: navigation.href(),
      uses: codeUses(server),
    }).toEqual({
      card: `${waitlist} ${email} Sign-ups are paused Open your invite link again later. Its code stays unused. ${field}`,
      at: routes.home(),
      uses: [],
    })
  })

  test('a person with app access uses no code, and the app opens as usual with no notice', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const { navigation } = openApp(server, joinPath(code))
    await waitFor(
      () => navigation.href() === routes.org('acme'),
      'the org of the app',
    )
    expect(codeUses(server)).toEqual([])
  })
})
