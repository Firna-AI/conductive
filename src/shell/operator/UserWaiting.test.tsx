// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import {
  operatorUserPath,
  type OperatorUserDetail,
} from '../../shared/operator'
import {
  operatorApprovalPath,
  type OperatorApprovalEmail,
  type OperatorApprovalResponse,
} from '../../shared/operator-waitlist'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { sampleOperator } from '../../test-support/fixtures/operator'
import { SAMPLE_IDS } from '../../test-support/fixtures/operator-samples'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { click, settle } from '../test-mount'
import { textOf } from '../test-render'
import { boxText, openUser, operatorRequests } from './operator-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** The user after an approval of the operator now, with its email. */
function approved(
  user: OperatorUserDetail,
  email: OperatorApprovalEmail,
): OperatorUserDetail {
  return {
    ...user,
    appAccess: {
      state: 'granted',
      grantedAt: FAKE_TIME,
      source: { kind: 'approval', operator: sampleOperator },
    },
    approvalEmail: email,
  }
}

function approval(
  githubId: number,
  email: OperatorApprovalEmail,
): OperatorApprovalResponse {
  return { githubId, changed: true, approvalEmail: email, emailFailed: false }
}

describe('the page of a person who waits', () => {
  test('has the notice of the waitlist and Approve beside Suspend user, and Approve sends {} and shows the approval with its email', async () => {
    const page = await openUser(SAMPLE_IDS.waitingUser)
    const main = textOf(page.view.querySelector('main')?.innerHTML ?? '')
    const email = { state: 'pending', updatedAt: FAKE_TIME } as const
    const approvalPath = operatorApprovalPath(page.user.githubId)
    page.server.json('POST', approvalPath, approval(page.user.githubId, email))
    page.server.json(
      'GET',
      operatorUserPath(page.user.githubId),
      approved(page.user, email),
    )
    click(byRole('button', 'Approve'))
    click(byRole('button', 'Approve', byRole('dialog', 'Approve @sam-okafor?')))
    await settle()
    expect({
      main,
      access: boxText(page.view, 'App access'),
      header: page.header(),
      requests: await operatorRequests(page.server),
    }).toEqual({
      main: 'Users @sam-okafor Sam Okafor Suspend user Approve Overview Orgs Users Waitlist Invite codes Providers On the waitlist since 1 Jan 2027 @sam-okafor sees only the waitlist screen until they get app access. Details Name Sam Okafor GitHub ID 91827364 On GitHub 9 years Joined 1 Jan 2027 Workspaces 0 owned, 0 running',
      access:
        'App access How Approved by @calummoore Since 15 Jan 2027 at 08:00 Approval email Not sent yet Conductive tries again on its own.',
      header: 'Users @sam-okafor Sam Okafor Suspend user',
      requests: [
        `GET ${operatorUserPath(page.user.githubId)}`,
        `POST ${approvalPath} {}`,
        `GET ${operatorUserPath(page.user.githubId)}`,
      ],
    })
  })

  test('without a verified email, Approve promises no email, and the page then says why no email went', async () => {
    const page = await openUser(SAMPLE_IDS.waitingNoEmail)
    const email = { state: 'none', updatedAt: FAKE_TIME } as const
    page.server.json(
      'POST',
      operatorApprovalPath(page.user.githubId),
      approval(page.user.githubId, email),
    )
    page.server.json(
      'GET',
      operatorUserPath(page.user.githubId),
      approved(page.user, email),
    )
    click(byRole('button', 'Approve'))
    const question = byRole('dialog', 'Approve @kenji-w?')
    const asked = textOf(question.innerHTML)
    click(byRole('button', 'Approve', question))
    await settle()
    expect({ asked, access: boxText(page.view, 'App access') }).toEqual({
      asked:
        'Approve @kenji-w? Kenji Watanabe gets app access now, and sees it at their next visit. No email goes out, because their GitHub account has no verified email. An approval is final. You can still suspend the user later. Cancel Approve',
      access:
        'App access How Approved by @calummoore Since 15 Jan 2027 at 08:00 Approval email Not sent This GitHub account has no verified email.',
    })
  })

  test('shows the suspension and Lift, and no Approve, while a suspension holds them', async () => {
    const suspension = {
      suspendedAt: FAKE_TIME - 60_000,
      operator: sampleOperator,
    }
    const page = await openUser(SAMPLE_IDS.waitingUser, {
      change: (user) => ({ ...user, suspension }),
    })
    expect({
      header: page.header(),
      approve: queryByRole('button', 'Approve'),
      notice: page
        .text()
        .includes('Suspended on 15 Jan at 07:59 by @calummoore'),
    }).toEqual({
      header: 'Users @sam-okafor Sam Okafor Lift suspension',
      approve: null,
      notice: true,
    })
  })
})
