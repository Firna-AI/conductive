// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { HeldRequests } from '../../app/test-kit'
import {
  operatorSignupPausePath,
  operatorWaitlistSwitchPath,
  type OperatorSignupPause,
} from '../../shared/operator-waitlist'
import {
  byRole,
  byText,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { sampleOperator } from '../../test-support/fixtures/operator'
import { SAMPLE_IDS } from '../../test-support/fixtures/operator-samples'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { serveOperator } from '../../test-support/operator'
import { click, settle } from '../test-mount'
import { textOf } from '../test-render'
import { mountShell, operatorRequests } from './operator-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const pausePath = operatorSignupPausePath()

/** The pause as the Worker gives it: on or off, since `at`, by the operator. */
function pause(paused: boolean, at: number): OperatorSignupPause {
  return { paused, updatedAt: at, operator: sampleOperator }
}

const notice =
  'Sign-ups paused on 15 Jan at 07:35 by @calummoore Invite codes, referral codes, and org invitations let nobody in until sign-ups resume. New people wait, also while the waitlist is off. Approve still works. Resume sign-ups'

/** The text of the notice of the pause at the top of the page, or null. */
function noticeOf(view: HTMLElement): string | null {
  const title = Array.from(view.querySelectorAll('main *')).find(
    (element) =>
      element.children.length === 0 &&
      element.textContent?.startsWith('Sign-ups paused on'),
  )
  const box = title?.parentElement?.parentElement
  return box ? textOf(box.innerHTML) : null
}

describe('the pause of sign-ups in the operator section', () => {
  test('Pause sign-ups asks first, sends {} with POST, and the notice of the pause takes the place of the Sign-ups box', async () => {
    const server = new FakeApiServer()
    serveOperator(server)
    server.json('POST', pausePath, pause(true, FAKE_TIME - 25 * 60_000))
    const { view } = await mountShell(server, routes.operatorCodes())
    const box = textOf(view.querySelector('main section')?.innerHTML ?? '')
    click(byRole('button', 'Pause sign-ups'))
    const question = byRole('dialog', 'Pause sign-ups?')
    const asked = textOf(question.innerHTML)
    click(byRole('button', 'Pause sign-ups', question))
    await settle()
    expect({
      box,
      asked,
      notice: noticeOf(view),
      boxAfter: queryByRole('button', 'Pause sign-ups'),
      requests: await operatorRequests(server, { pause: true }),
    }).toEqual({
      box: 'Sign-ups Waitlist on Invite codes, referral codes, and org invitations let new people in. Turn off the waitlist Pause sign-ups',
      asked:
        'Pause sign-ups? Invite codes, referral codes, and org invitations let nobody in until sign-ups resume. Each code keeps its uses. New people wait, also while the waitlist is off. Approve still works. Cancel Pause sign-ups',
      notice,
      boxAfter: null,
      requests: [
        'GET /api/operator/invite-codes',
        `GET ${pausePath}`,
        `POST ${pausePath} {}`,
      ],
    })
  })

  test('while sign-ups are paused, the notice tops each tab of the section, and Resume sign-ups acts at once with DELETE', async () => {
    const server = new FakeApiServer()
    serveOperator(server)
    server.json('GET', pausePath, pause(true, FAKE_TIME - 25 * 60_000))
    const shown = []
    for (const href of [
      routes.operator(),
      routes.operatorOrgs(),
      routes.operatorUsers(),
      routes.operatorWaitlist(),
      routes.operatorUser(SAMPLE_IDS.activeUser),
    ]) {
      const { view } = await mountShell(server, href)
      shown.push(noticeOf(view))
    }
    const { view } = await mountShell(server, routes.operatorCodes())
    shown.push(noticeOf(view))
    expect(shown).toEqual([notice, notice, notice, notice, notice, notice])
    const before = server.requests.length
    server.json('DELETE', pausePath, pause(false, FAKE_TIME))
    click(byRole('button', 'Resume sign-ups', view))
    await settle()
    const sent = server.requests.slice(before).map((request) => request.method)
    expect({
      sent,
      question: queryByRole('dialog', 'Resume sign-ups?'),
      after: noticeOf(view),
      box: queryByRole('button', 'Pause sign-ups', view) !== null,
    }).toEqual({
      sent: ['DELETE'],
      question: null,
      after: null,
      box: true,
    })
  })

  test('each page reads the pause and the waitlist switch when it opens', async () => {
    const server = new FakeApiServer()
    serveOperator(server)
    const { view } = await mountShell(server, routes.operator())
    const tabs = view.querySelector<HTMLElement>('nav[aria-label="Operator"]')
    if (!tabs) throw new Error('The page has no tabs.')
    click(byText('Waitlist', tabs))
    await settle()
    const switchPath = operatorWaitlistSwitchPath()
    expect(
      await operatorRequests(server, { pause: true, waitlistSwitch: true }),
    ).toEqual([
      'GET /api/operator/overview',
      `GET ${pausePath}`,
      `GET ${switchPath}`,
      'GET /api/operator/waitlist',
      `GET ${pausePath}`,
      `GET ${switchPath}`,
    ])
  })

  test('the Sign-ups box keeps its place while the pause loads, and a pause that did not load shows its failure with Try again', async () => {
    const server = new FakeApiServer()
    serveOperator(server)
    const held = new HeldRequests(server)
    held.hold('GET', pausePath)
    const { view } = await mountShell(server, routes.operatorCodes(), {
      services: { fetch: held.fetch },
    })
    const loading = textOf(view.querySelector('main section')?.innerHTML ?? '')
    server.json(
      'GET',
      pausePath,
      { error: { code: 'internal_error', message: 'The request failed.' } },
      500,
    )
    held.release('GET', pausePath)
    await settle()
    const failed = queryByText('Sign-ups could not load') !== null
    server.json('GET', pausePath, pause(false, FAKE_TIME))
    click(byRole('button', 'Try again'))
    await settle()
    expect({
      loading,
      failed,
      retried: queryByRole('button', 'Pause sign-ups') !== null,
    }).toEqual({ loading: 'Sign-ups', failed: true, retried: true })
  })
})
