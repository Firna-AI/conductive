// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { HeldRequests } from '../../app/test-kit'
import {
  operatorApprovalPath,
  operatorWaitlistPath,
} from '../../shared/operator-waitlist'
import { byRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { SAMPLE_IDS } from '../../test-support/fixtures/operator-samples'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { serveOperator } from '../../test-support/operator'
import { click, settle } from '../test-mount'
import { mountShell, operatorRequests } from './operator-test-kit'
import {
  approvalReply,
  waitlistBox,
  waitlistPage,
  waitlistRows,
} from './waitlist-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

describe('Show more on the Waitlist tab, with approvals', () => {
  test('Show more keeps each approved row in place and counts it out once, also when the page answers after the approval', async () => {
    const server = new FakeApiServer()
    const { waitlist } = serveOperator(server)
    const held = new HeldRequests(server)
    const first = waitlistPage(waitlist.slice(0, 4), 10, 'p2')
    server.json('GET', operatorWaitlistPath(), first)
    const second = waitlistPage(waitlist.slice(4, 7), 9, 'p3')
    server.json('GET', operatorWaitlistPath({ cursor: 'p2' }), second)
    const third = waitlistPage(waitlist.slice(7), 8)
    server.json('GET', operatorWaitlistPath({ cursor: 'p3' }), third)
    const sam = operatorApprovalPath(SAMPLE_IDS.waitingUser)
    server.json('POST', sam, approvalReply(SAMPLE_IDS.waitingUser, 'sent'))
    const kenji = operatorApprovalPath(SAMPLE_IDS.waitingNoEmail)
    server.json('POST', kenji, approvalReply(SAMPLE_IDS.waitingNoEmail, 'none'))
    const { view } = await mountShell(server, routes.operatorWaitlist(), {
      services: { fetch: held.fetch },
    })
    click(byRole('button', 'Approve @sam-okafor'))
    click(byRole('button', 'Approve', byRole('dialog', 'Approve @sam-okafor?')))
    await settle()
    click(byRole('button', 'Show more'))
    await settle()
    const paged = waitlistBox(view)
    held.hold('GET', operatorWaitlistPath())
    click(byRole('button', 'Show more'))
    await settle()
    click(byRole('button', 'Approve @kenji-w'))
    click(byRole('button', 'Approve', byRole('dialog', 'Approve @kenji-w?')))
    await settle()
    held.release('GET', operatorWaitlistPath())
    await settle()
    expect({
      paged,
      box: waitlistBox(view),
      requests: await operatorRequests(server),
    }).toEqual({
      paged: [
        'Waitlist 9 people wait, oldest first. Person On GitHub Joined',
        'SO @sam-okafor Sam Okafor 9 years 1 Jan Approved Email sent',
        ...waitlistRows.slice(1, 7),
        'Show more',
      ].join(' '),
      box: [
        'Waitlist 8 people wait, oldest first. Person On GitHub Joined',
        'SO @sam-okafor Sam Okafor 9 years 1 Jan Approved Email sent',
        ...waitlistRows.slice(1, 3),
        'KW @kenji-w Kenji Watanabe 4 years 4 Jan Approved No email sent',
        ...waitlistRows.slice(4),
      ].join(' '),
      requests: [
        'GET /api/operator/waitlist',
        `POST ${sam} {}`,
        'GET /api/operator/waitlist?cursor=p2',
        `POST ${kenji} {}`,
        'GET /api/operator/waitlist?cursor=p3',
      ],
    })
  })

  test('a page that answers while an approval runs still counts the approval out once', async () => {
    const server = new FakeApiServer()
    const { waitlist } = serveOperator(server)
    const held = new HeldRequests(server)
    const first = waitlistPage(waitlist.slice(0, 8), 10, 'p2')
    server.json('GET', operatorWaitlistPath(), first)
    const next = waitlistPage(waitlist.slice(8), 9)
    server.json('GET', operatorWaitlistPath({ cursor: 'p2' }), next)
    const sam = operatorApprovalPath(SAMPLE_IDS.waitingUser)
    server.json('POST', sam, approvalReply(SAMPLE_IDS.waitingUser, 'sent'))
    const { view } = await mountShell(server, routes.operatorWaitlist(), {
      services: { fetch: held.fetch },
    })
    held.hold('GET', operatorWaitlistPath())
    click(byRole('button', 'Show more'))
    await settle()
    held.holdAnswer('POST', sam)
    click(byRole('button', 'Approve @sam-okafor'))
    click(byRole('button', 'Approve', byRole('dialog', 'Approve @sam-okafor?')))
    await settle()
    held.release('GET', operatorWaitlistPath())
    await settle()
    held.release('POST', sam)
    await settle()
    expect({
      box: waitlistBox(view),
      requests: await operatorRequests(server),
    }).toEqual({
      box: [
        'Waitlist 9 people wait, oldest first. Person On GitHub Joined',
        'SO @sam-okafor Sam Okafor 9 years 1 Jan Approved Email sent',
        ...waitlistRows.slice(1),
      ].join(' '),
      requests: [
        'GET /api/operator/waitlist',
        `POST ${sam} {}`,
        'GET /api/operator/waitlist?cursor=p2',
      ],
    })
  })
})
