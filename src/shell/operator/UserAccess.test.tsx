// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import {
  operatorUserPath,
  userSuspensionPath,
  type UserSuspensionResponse,
} from '../../shared/operator'
import { operatorCodeDisablePath } from '../../shared/operator-waitlist'
import {
  byRole,
  byText,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { sampleOperator } from '../../test-support/fixtures/operator'
import { disabledCode } from '../../test-support/fixtures/operator-access'
import { SAMPLE_IDS } from '../../test-support/fixtures/operator-samples'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { click, settle } from '../test-mount'
import { textOf } from '../test-render'
import { boxOf, boxText, openUser, operatorRequests } from './operator-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** The reply of the suspension of Mira Santos, whose stops all finished. */
const suspended: UserSuspensionResponse = {
  userId: 'mira',
  suspendedAt: FAKE_TIME,
  pendingWorkspaceIds: [],
  pendingBuildIds: [],
}

/** Each way in of the samples: the login, the GitHub ID, and the App access rows. */
const ways = [
  ['rho-9', 81234567, 'How Invite code Launch week Since 15 Jan 2027 at 06:05'],
  [
    'tide-sam',
    80555121,
    'How Referral code of @mira-s Since 14 Jan 2027 at 06:05',
  ],
  [
    'kt-null',
    66213409,
    'How Org invitation to Hexwave from @vex-ops Since 4 Jan 2027 at 06:05',
  ],
  ['vex-ops', 77120345, 'How As an operator Since 4 Jan 2027 at 06:00'],
  [
    'ana-p',
    61000001,
    'How Approved by @calummoore Since 11 Jan 2027 at 06:00 Approval email Sent on 11 Jan 2027 at 06:01',
  ],
  [
    'joe-q',
    61000002,
    'How Approved by @calummoore Since 11 Jan 2027 at 06:00 Approval email Not sent Conductive stopped trying on 12 Jan.',
  ],
] as const

describe('the app access and the referral code on the page of a user', () => {
  test('App access names each way in with links to what let the user in, and the state of the approval email', async () => {
    const shown: Record<string, string | null> = {}
    const links: (string | null)[] = []
    for (const [login, githubId] of ways) {
      const page = await openUser(githubId)
      shown[login] = boxText(page.view, 'App access')
      const access = boxOf(page.view, 'App access')
      if (login === 'rho-9' && access) {
        links.push(byText('Launch week', access).getAttribute('href'))
      }
      if (login === 'kt-null' && access) {
        links.push(byText('Hexwave', access).getAttribute('href'))
        links.push(byText('@vex-ops', access).getAttribute('href'))
      }
    }
    expect({ shown, links }).toEqual({
      shown: Object.fromEntries(
        ways.map(([login, , text]) => [login, `App access ${text}`]),
      ),
      links: [
        routes.operatorCodes('V7MKC-2QDXH'),
        routes.operatorOrg('org_h3xw4v8q'),
        routes.operatorUser(77120345),
      ],
    })
  })

  test('the referral code gives Copy join link, its uses, and who used it; Disable code asks first, sends {}, and the page shows the disable', async () => {
    const copied: string[] = []
    const page = await openUser(SAMPLE_IDS.activeUser, {
      services: { copy: async (text) => void copied.push(await text) },
    })
    const { server, user } = page
    if (!user.referralCode) throw new Error('Mira has no referral code.')
    click(byRole('button', 'Copy the join link of M4QTX-7HKWD'))
    const path = operatorCodeDisablePath(user.referralCode.code)
    const off = disabledCode(user.referralCode, FAKE_TIME, sampleOperator)
    server.json('POST', path, off)
    server.json('GET', operatorUserPath(user.githubId), {
      ...user,
      referralCode: { ...off, recipients: user.referralCode.recipients },
    })
    click(byRole('button', 'Disable code'))
    const question = byRole('dialog', 'Disable the referral code of @mira-s?')
    const asked = textOf(question.innerHTML)
    click(byRole('button', 'Disable code', question))
    await settle()
    const after = boxText(page.view, 'Referral code')
    const requests = await operatorRequests(server)
    click(byText('@tide-sam', page.view))
    await settle()
    expect({
      copied,
      asked,
      after,
      opened: page.view.querySelector('main h1')?.textContent,
      requests,
    }).toEqual({
      copied: ['https://app.conductive.test/join/M4QTX-7HKWD'],
      asked:
        'Disable the referral code of @mira-s? M4QTX-7HKWD stops working now. The person who used it keeps their app access. Disable is final. Cancel Disable code',
      after:
        'Referral code Disabled Code M4QTX-7HKWD Uses 1 of 5 used Disabled 15 Jan 2027 at 08:00 by @calummoore Used by SO @tide-sam Sam Ortiz 14 Jan',
      opened: '@tide-sam',
      requests: [
        `GET ${operatorUserPath(user.githubId)}`,
        `POST ${path} {}`,
        `GET ${operatorUserPath(user.githubId)}`,
      ],
    })
  })

  test('a person with no name on GitHub who used the referral code shows only the login, with one initial', async () => {
    const page = await openUser(SAMPLE_IDS.activeUser, {
      change: (user) =>
        user.referralCode
          ? {
              ...user,
              referralCode: {
                ...user.referralCode,
                recipients: user.referralCode.recipients.map((recipient) => ({
                  ...recipient,
                  name: null,
                })),
              },
            }
          : user,
    })
    const list = byRole('list', 'People who used M4QTX-7HKWD', page.view)
    expect(textOf(list.innerHTML)).toBe('T @tide-sam 14 Jan')
  })

  test('the Suspend question offers to disable a referral code that works, on by default, and with the offer off the code stays', async () => {
    const page = await openUser(SAMPLE_IDS.activeUser)
    const path = userSuspensionPath(page.user.githubId)
    page.server.json('POST', path, suspended)
    click(byRole('button', 'Suspend user'))
    const question = byRole('dialog', 'Suspend @mira-s?')
    const offer = byText('Also disable their referral code', question).closest(
      'label',
    )
    const check = offer?.querySelector('input')
    if (!offer || !check) throw new Error('The question has no offer.')
    const checked = check.checked
    click(check)
    click(byRole('button', 'Suspend user', question))
    await settle()
    expect({
      offer: textOf(offer.innerHTML),
      checked,
      requests: await operatorRequests(page.server),
    }).toEqual({
      offer:
        'Also disable their referral code M4QTX-7HKWD then lets nobody in, also after a lift. Disable is final.',
      checked: true,
      requests: [
        `GET ${operatorUserPath(page.user.githubId)}`,
        `POST ${path} {}`,
        `GET ${operatorUserPath(page.user.githubId)}`,
      ],
    })
  })

  test('a disable that fails after the suspension names what failed, and the suspension holds', async () => {
    const page = await openUser(SAMPLE_IDS.activeUser)
    const path = userSuspensionPath(page.user.githubId)
    page.server.json('POST', path, suspended)
    page.server.json(
      'POST',
      operatorCodeDisablePath('M4QTX-7HKWD'),
      { error: { code: 'internal_error', message: 'The request failed.' } },
      500,
    )
    click(byRole('button', 'Suspend user'))
    click(
      byRole('button', 'Suspend user', byRole('dialog', 'Suspend @mira-s?')),
    )
    await settle()
    expect({
      toast:
        queryByText("The referral code of @mira-s wasn't disabled") !== null,
      question: queryByRole('dialog', 'Suspend @mira-s?'),
      requests: await operatorRequests(page.server),
    }).toEqual({
      toast: true,
      question: null,
      requests: [
        `GET ${operatorUserPath(page.user.githubId)}`,
        `POST ${path} {}`,
        `GET ${operatorUserPath(page.user.githubId)}`,
        'POST /api/operator/invite-codes/M4QTX-7HKWD/disable {}',
      ],
    })
  })
})
