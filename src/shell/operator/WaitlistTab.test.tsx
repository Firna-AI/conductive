// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import {
  operatorApprovalPath,
  operatorWaitlistPath,
} from '../../shared/operator-waitlist'
import {
  byLabel,
  byRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { SAMPLE_IDS } from '../../test-support/fixtures/operator-samples'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { serveOperator } from '../../test-support/operator'
import { click, settle } from '../test-mount'
import { textOf } from '../test-render'
import { mountShell, operatorRequests } from './operator-test-kit'
import {
  approvalReply,
  waitlistBox,
  waitlistPage,
  waitlistRows,
} from './waitlist-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

describe('the Waitlist tab of the operator section', () => {
  test('lists the people who wait, oldest first, with the age on GitHub and the join day, and each login opens the GitHub profile in a new tab', async () => {
    const server = new FakeApiServer()
    serveOperator(server)
    const { view } = await mountShell(server, routes.operatorWaitlist())
    const box = waitlistBox(view)
    const profile = byLabel('@sam-okafor on GitHub')
    const phone = await mountShell(server, routes.operatorWaitlist(), {
      viewport: 'phone',
    })
    expect({
      box,
      profile: [profile.getAttribute('href'), profile.getAttribute('target')],
      phone: waitlistBox(phone.view).split(' JM @jules-m')[0],
    }).toEqual({
      box: [
        'Waitlist 10 people wait, oldest first. Person On GitHub Joined',
        ...waitlistRows,
      ].join(' '),
      profile: ['https://github.com/sam-okafor', '_blank'],
      phone:
        'Waitlist 10 people wait, oldest first. Person SO @sam-okafor Sam Okafor 9 years on GitHub Approve',
    })
  })

  test('a search counts its matches, and a search with no match says what the search takes', async () => {
    const server = new FakeApiServer()
    const fixtures = serveOperator(server)
    const sam = fixtures.waitlist.filter((user) => user.login.startsWith('sam'))
    server.json('GET', operatorWaitlistPath({ q: 'sam' }), waitlistPage(sam))
    server.json('GET', operatorWaitlistPath({ q: 'zara' }), waitlistPage([]))
    const found = await mountShell(server, routes.operatorWaitlist('sam'))
    const none = await mountShell(server, routes.operatorWaitlist('zara'))
    expect({
      found: waitlistBox(found.view),
      none: waitlistBox(none.view),
    }).toEqual({
      found: `Waitlist 2 people match “sam”. Person On GitHub Joined ${waitlistRows[0]} ${waitlistRows[7]}`,
      none: 'Waitlist Search by GitHub login, name, or GitHub ID. Nobody on the waitlist matches “zara”.',
    })
  })

  test('Show more reads the next people with the cursor', async () => {
    const server = new FakeApiServer()
    const fixtures = serveOperator(server)
    const { waitlist } = fixtures
    server.json(
      'GET',
      operatorWaitlistPath(),
      waitlistPage(waitlist.slice(0, 8), 10, 'p2'),
    )
    server.json(
      'GET',
      operatorWaitlistPath({ cursor: 'p2' }),
      waitlistPage(waitlist.slice(8), 10),
    )
    const { view } = await mountShell(server, routes.operatorWaitlist())
    click(byRole('button', 'Show more'))
    await settle()
    expect({
      box: waitlistBox(view),
      requests: await operatorRequests(server),
    }).toEqual({
      box: [
        'Waitlist 10 people wait, oldest first. Person On GitHub Joined',
        ...waitlistRows,
      ].join(' '),
      requests: [
        'GET /api/operator/waitlist',
        'GET /api/operator/waitlist?cursor=p2',
      ],
    })
  })

  test('Approve asks first and promises the email, sends {}, and the row stays with Approved and the email state, out of the count', async () => {
    const server = new FakeApiServer()
    serveOperator(server)
    const path = operatorApprovalPath(SAMPLE_IDS.waitingUser)
    server.json('POST', path, approvalReply(SAMPLE_IDS.waitingUser, 'sent'))
    const { view } = await mountShell(server, routes.operatorWaitlist())
    click(byRole('button', 'Approve @sam-okafor'))
    const question = byRole('dialog', 'Approve @sam-okafor?')
    const asked = textOf(question.innerHTML)
    click(byRole('button', 'Approve', question))
    await settle()
    expect({
      asked,
      box: waitlistBox(view),
      open: queryByRole('dialog', 'Approve @sam-okafor?'),
      requests: await operatorRequests(server),
    }).toEqual({
      asked:
        'Approve @sam-okafor? Sam Okafor gets app access now, and an email tells them that they can come in. An approval is final. You can still suspend the user later. Cancel Approve',
      box: [
        'Waitlist 9 people wait, oldest first. Person On GitHub Joined',
        'SO @sam-okafor Sam Okafor 9 years 1 Jan Approved Email sent',
        ...waitlistRows.slice(1),
      ].join(' '),
      open: null,
      requests: ['GET /api/operator/waitlist', `POST ${path} {}`],
    })
  })

  test('without a verified email, Approve promises no email, and an email that did not go yet is no error', async () => {
    const server = new FakeApiServer()
    serveOperator(server)
    const kenji = operatorApprovalPath(SAMPLE_IDS.waitingNoEmail)
    server.json('POST', kenji, approvalReply(SAMPLE_IDS.waitingNoEmail, 'none'))
    const sam = operatorApprovalPath(SAMPLE_IDS.waitingUser)
    server.json(
      'POST',
      sam,
      approvalReply(SAMPLE_IDS.waitingUser, 'pending', true),
    )
    const { view } = await mountShell(server, routes.operatorWaitlist())
    click(byRole('button', 'Approve @kenji-w'))
    const question = byRole('dialog', 'Approve @kenji-w?')
    const asked = textOf(question.innerHTML)
    click(byRole('button', 'Approve', question))
    await settle()
    click(byRole('button', 'Approve @sam-okafor'))
    click(byRole('button', 'Approve', byRole('dialog', 'Approve @sam-okafor?')))
    await settle()
    expect({ asked, box: waitlistBox(view) }).toEqual({
      asked:
        'Approve @kenji-w? Kenji Watanabe gets app access now, and sees it at their next visit. No email goes out, because their GitHub account has no verified email. An approval is final. You can still suspend the user later. Cancel Approve',
      box: [
        'Waitlist 8 people wait, oldest first. Person On GitHub Joined',
        'SO @sam-okafor Sam Okafor 9 years 1 Jan Approved Email not sent yet',
        ...waitlistRows.slice(1, 3),
        'KW @kenji-w Kenji Watanabe 4 years 4 Jan Approved No email sent',
        ...waitlistRows.slice(4),
      ].join(' '),
    })
  })

  test('a refused approval shows its error in the question, which stays open, and the row keeps Approve', async () => {
    const server = new FakeApiServer()
    serveOperator(server)
    server.json(
      'POST',
      operatorApprovalPath(SAMPLE_IDS.waitingUser),
      {
        error: {
          code: 'user_suspended',
          message: 'Lift this account suspension before approval.',
        },
      },
      409,
    )
    await mountShell(server, routes.operatorWaitlist())
    click(byRole('button', 'Approve @sam-okafor'))
    const question = byRole('dialog', 'Approve @sam-okafor?')
    click(byRole('button', 'Approve', question))
    await settle()
    expect({
      failure: queryByText("@sam-okafor wasn't approved", question) !== null,
      reason:
        queryByText(
          'Lift this account suspension before approval.',
          question,
        ) !== null,
      open: queryByRole('dialog', 'Approve @sam-okafor?') === question,
    }).toEqual({ failure: true, reason: true, open: true })
  })

  test('with nobody on the waitlist, the tab says so and has no search', async () => {
    const server = new FakeApiServer()
    serveOperator(server)
    server.json('GET', operatorWaitlistPath(), waitlistPage([]))
    const { view } = await mountShell(server, routes.operatorWaitlist())
    expect({
      box: waitlistBox(view),
      search: queryByRole('textbox', 'Search the waitlist'),
    }).toEqual({
      box: 'Waitlist Nobody is waiting People show here after their first sign-in, oldest first.',
      search: null,
    })
  })

  test('a waitlist that did not load shows its failure with Try again, which reads it again', async () => {
    const server = new FakeApiServer()
    serveOperator(server)
    server.json(
      'GET',
      operatorWaitlistPath(),
      { error: { code: 'internal_error', message: 'The request failed.' } },
      500,
    )
    const { text } = await mountShell(server, routes.operatorWaitlist())
    const failed = text().includes(
      'The waitlist could not load The request failed. Try again',
    )
    serveOperator(server)
    click(byRole('button', 'Try again'))
    await settle()
    expect({
      failed,
      retried: text().includes('10 people wait, oldest first.'),
    }).toEqual({ failed: true, retried: true })
  })
})
