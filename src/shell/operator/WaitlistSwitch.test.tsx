// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { HeldRequests } from '../../app/test-kit'
import {
  operatorSignupPausePath,
  operatorWaitlistSwitchPath,
  type OperatorSignupPause,
  type OperatorWaitlistSwitch,
} from '../../shared/operator-waitlist'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { sampleOperator } from '../../test-support/fixtures/operator'
import { SAMPLE_IDS } from '../../test-support/fixtures/operator-samples'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { serveOperator } from '../../test-support/operator'
import { click, settle } from '../test-mount'
import { textOf } from '../test-render'
import { boxText, mountShell, operatorRequests } from './operator-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const switchPath = operatorWaitlistSwitchPath()
const pausePath = operatorSignupPausePath()
const MINUTE = 60_000

/** The switch as the Worker gives it, with 38 people who wait. */
function waitlist(
  waitlistOn: boolean,
  at: number | null,
): OperatorWaitlistSwitch {
  return {
    waitlistOn,
    updatedAt: at,
    operator: at === null ? null : sampleOperator,
    waiting: 38,
  }
}

const paused: OperatorSignupPause = {
  paused: true,
  updatedAt: FAKE_TIME - 25 * MINUTE,
  operator: sampleOperator,
}

const failure = {
  error: { code: 'internal_error', message: 'The request failed.' },
}

const offNotice =
  'Waitlist turned off on 15 Jan at 07:35 by @calummoore Each new sign-in gets app access at once. People on the waitlist get it at their next visit. Turn on the waitlist'

const boxOn =
  'Sign-ups Waitlist on Invite codes, referral codes, and org invitations let new people in. Turn off the waitlist Pause sign-ups'

/**
 * The texts of the notices of the pause and of the switch at the top of
 * the page, in the order of the page.
 */
function noticesOf(view: HTMLElement): string[] {
  return Array.from(view.querySelectorAll('main *'))
    .filter(
      (element) =>
        element.children.length === 0 &&
        /^(Sign-ups paused on|Waitlist turned off on)/.test(
          element.textContent ?? '',
        ),
    )
    .map((title) => textOf(title.parentElement?.parentElement?.innerHTML ?? ''))
}

describe('the waitlist switch in the operator section', () => {
  test('Turn off the waitlist asks first with the people who wait; a failed turn-off stays in the question; a turn-off sends {} with DELETE, and the notice of the switch tops the page while the box says Open', async () => {
    const server = new FakeApiServer()
    serveOperator(server)
    server.json('GET', switchPath, waitlist(true, null))
    server.json('DELETE', switchPath, failure, 500)
    const { view } = await mountShell(server, routes.operatorCodes())
    click(byRole('button', 'Turn off the waitlist', view))
    const question = byRole('dialog', 'Turn off the waitlist?')
    const asked = textOf(question.innerHTML)
    click(byRole('button', 'Turn off', question))
    await settle()
    const failed = textOf(byRole('dialog', 'Turn off the waitlist?').innerHTML)
    server.json('DELETE', switchPath, waitlist(false, FAKE_TIME - 25 * MINUTE))
    click(
      byRole('button', 'Turn off', byRole('dialog', 'Turn off the waitlist?')),
    )
    await settle()
    const words =
      'Each new sign-in gets app access at once. 38 people wait now. Each of them gets app access at their next visit. No email goes out. Nobody loses app access when you turn the waitlist on again.'
    expect({
      asked,
      failed,
      question: queryByRole('dialog', 'Turn off the waitlist?'),
      notices: noticesOf(view),
      box: boxText(view, 'Sign-ups'),
      requests: await operatorRequests(server, { waitlistSwitch: true }),
    }).toEqual({
      asked: `Turn off the waitlist? ${words} Cancel Turn off`,
      failed: `Turn off the waitlist? ${words} The waitlist wasn't turned off The request failed. Cancel Turn off`,
      question: null,
      notices: [offNotice],
      box: 'Sign-ups Open Pause sign-ups',
      requests: [
        'GET /api/operator/invite-codes',
        `GET ${switchPath}`,
        `DELETE ${switchPath} {}`,
        `DELETE ${switchPath} {}`,
      ],
    })
  })

  test('while the waitlist is off, the notice of the switch tops each page of the section, and Turn on the waitlist acts at once with POST', async () => {
    const server = new FakeApiServer()
    serveOperator(server)
    server.json('GET', switchPath, waitlist(false, FAKE_TIME - 25 * MINUTE))
    const shown: string[][] = []
    for (const href of [
      routes.operator(),
      routes.operatorOrgs(),
      routes.operatorUsers(),
      routes.operatorWaitlist(),
      routes.operatorUser(SAMPLE_IDS.activeUser),
    ]) {
      const { view } = await mountShell(server, href)
      shown.push(noticesOf(view))
    }
    const { view } = await mountShell(server, routes.operatorCodes())
    shown.push(noticesOf(view))
    const box = boxText(view, 'Sign-ups')
    const before = server.requests.length
    server.json('POST', switchPath, waitlist(true, FAKE_TIME))
    click(byRole('button', 'Turn on the waitlist', view))
    await settle()
    const sent = server.requests
      .slice(before)
      .map((request) => `${request.method} ${new URL(request.url).pathname}`)
    expect({
      shown,
      box,
      sent,
      question: queryByRole('dialog', 'Turn on the waitlist?'),
      after: noticesOf(view),
      boxAfter: boxText(view, 'Sign-ups'),
    }).toEqual({
      shown: Array.from({ length: 6 }, () => [offNotice]),
      box: 'Sign-ups Open Pause sign-ups',
      sent: [`POST ${switchPath}`],
      question: null,
      after: [],
      boxAfter: boxOn,
    })
  })

  test('the notice of the switch waits for the pause; while sign-ups are paused, the notice of the pause comes first, the notice of the switch says that sign-ins get in when sign-ups resume, and no Sign-ups box shows', async () => {
    const server = new FakeApiServer()
    serveOperator(server)
    server.json('GET', switchPath, waitlist(false, FAKE_TIME - 90 * MINUTE))
    server.json('GET', pausePath, paused)
    const held = new HeldRequests(server)
    held.hold('GET', pausePath)
    const { view } = await mountShell(server, routes.operatorCodes(), {
      services: { fetch: held.fetch },
    })
    const beforePause = noticesOf(view)
    held.release('GET', pausePath)
    await settle()
    expect({
      beforePause,
      notices: noticesOf(view),
      box: boxText(view, 'Sign-ups'),
      turnOff: queryByRole('button', 'Turn off the waitlist', view),
    }).toEqual({
      beforePause: [],
      notices: [
        'Sign-ups paused on 15 Jan at 07:35 by @calummoore Invite codes, referral codes, and org invitations let nobody in until sign-ups resume. New people wait, also while the waitlist is off. Approve still works. Resume sign-ups',
        'Waitlist turned off on 15 Jan at 06:30 by @calummoore When sign-ups resume, each new sign-in gets app access at once. People on the waitlist get it at their next visit. Turn on the waitlist',
      ],
      box: null,
      turnOff: null,
    })
  })

  test('a waitlist switch that did not load shows its failure in the Sign-ups box with Try again, and Pause sign-ups stays', async () => {
    const server = new FakeApiServer()
    serveOperator(server)
    server.json('GET', switchPath, failure, 500)
    const { view } = await mountShell(server, routes.operatorCodes())
    const failed = boxText(view, 'Sign-ups')
    const notices = noticesOf(view)
    server.json('GET', switchPath, waitlist(true, null))
    click(byRole('button', 'Try again', view))
    await settle()
    expect({
      failed,
      notices,
      retried: boxText(view, 'Sign-ups'),
    }).toEqual({
      failed:
        'Sign-ups The waitlist switch could not load The request failed. Try again Pause sign-ups',
      notices: [],
      retried: boxOn,
    })
  })
})
