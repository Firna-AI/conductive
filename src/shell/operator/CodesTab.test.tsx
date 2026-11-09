// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import {
  operatorCodeDisablePath,
  operatorCodesPath,
  type OperatorAccessCode,
  type OperatorCodesResponse,
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
import { disabledCode } from '../../test-support/fixtures/operator-access'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { serveOperator } from '../../test-support/operator'
import { click, settle, typeText } from '../test-mount'
import { textOf } from '../test-render'
import { mountShell, operatorRequests } from './operator-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** The text of the box of the codes: the box after the Sign-ups box. */
function codesBox(view: HTMLElement): string {
  const boxes = view.querySelectorAll('main section')
  return textOf(boxes[boxes.length - 1]?.innerHTML ?? '')
}

function page(codes: readonly OperatorAccessCode[]): OperatorCodesResponse {
  return { codes, total: codes.length, nextCursor: null }
}

/** The code of the samples with this text. */
function codeOf(codes: readonly OperatorAccessCode[], text: string) {
  const code = codes.find((item) => item.code === text)
  if (!code) throw new Error(`The samples have no code ${text}.`)
  return code
}

/** Whether a person can press the button: it is not disabled. */
function enabled(button: HTMLElement): boolean {
  return (
    !button.hasAttribute('disabled') &&
    button.getAttribute('aria-disabled') !== 'true'
  )
}

const header = 'Label Code State Uses'
const rows = [
  'Launch week by @calummoore · 6 Jan V7MKC-2QDXH Active 12 of 50',
  'Meetup Lisbon by @ellie-w · 5 Jan TQ8WN-2HKXP Active 7 of 30',
  'Design partners by @calummoore · 4 Jan 9PTXC-4WHMN Used up 5 of 5',
  'Hacker News by @calummoore · 3 Jan HM3PE-7KWQT Disabled 18 of 100',
  'Friends by @calummoore · 2 Jan 6FJDA-9RCVY Active 3 of 10',
  'Beta testers by @calummoore · 1 Jan X2NRT-5GJHD Active 24 of 25',
]

describe('the Invite codes tab of the operator section', () => {
  test('lists the invite codes newest first; Copy copies a code, Copy join link its link on the app host, and only a code that works has them both and Disable', async () => {
    const server = new FakeApiServer()
    serveOperator(server)
    const copied: string[] = []
    const copy = async (text: string) => {
      copied.push(text)
    }
    const { view } = await mountShell(server, routes.operatorCodes(), {
      services: { copy },
    })
    click(byRole('button', 'Copy the code V7MKC-2QDXH'))
    click(byRole('button', 'Copy the join link of V7MKC-2QDXH'))
    await settle()
    expect({
      box: codesBox(view),
      copied,
      toast: queryByText('Copied the join link of V7MKC-2QDXH') !== null,
      usedUp: [
        queryByRole('button', 'Copy the join link of 9PTXC-4WHMN'),
        queryByRole('button', 'Disable Design partners'),
      ],
      active: queryByRole('button', 'Disable Friends') !== null,
    }).toEqual({
      box: ['Invite codes 6 invite codes, newest first.', header, ...rows].join(
        ' ',
      ),
      copied: ['V7MKC-2QDXH', 'https://app.conductive.test/join/V7MKC-2QDXH'],
      toast: true,
      usedUp: [null, null],
      active: true,
    })
  })

  test('a search finds a referral code, which names its owner, who opens their page, and a search with no match says what the search takes', async () => {
    const server = new FakeApiServer()
    const fixtures = serveOperator(server)
    const mira = codeOf(fixtures.codes, 'M4QTX-7HKWD')
    server.json('GET', operatorCodesPath({ q: 'm4qtx7hkwd' }), page([mira]))
    server.json('GET', operatorCodesPath({ q: 'Q9XWP-4MTRA' }), page([]))
    const found = await mountShell(server, routes.operatorCodes('m4qtx7hkwd'))
    const box = codesBox(found.view)
    click(byText('@mira-s', found.view))
    await settle()
    const opened = found.view.querySelector('main h1')?.textContent
    const none = await mountShell(server, routes.operatorCodes('Q9XWP-4MTRA'))
    expect({ box, opened, none: codesBox(none.view) }).toEqual({
      box: `Codes 1 referral code matches. ${header} Referral code of @mira-s M4QTX-7HKWD Active 1 of 5`,
      opened: '@mira-s',
      none: 'Codes Search by a code, the label of an invite code, or the GitHub login of an owner. No code matches “Q9XWP-4MTRA”.',
    })
  })

  test('New code asks for a label and a use limit, shows a refusal in place, and the made code leads the list', async () => {
    const server = new FakeApiServer()
    const fixtures = serveOperator(server)
    const refused = {
      error: {
        code: 'invalid_invite_code',
        message:
          'Enter a label of up to 80 characters and a whole use limit of 1 or more.',
      },
    }
    server.json('POST', operatorCodesPath(), refused, 400)
    const { view } = await mountShell(server, routes.operatorCodes())
    click(byRole('button', 'New code'))
    const dialog = byRole('dialog', 'New invite code')
    const make = byRole('button', 'Make code', dialog)
    const empty = enabled(make)
    const [label, limit] = Array.from(dialog.querySelectorAll('input'))
    typeText(label, ' Meetup Porto ')
    typeText(limit, '40')
    const filled = enabled(make)
    click(make)
    await settle()
    const shown = queryByText(refused.error.message, dialog) !== null
    const made: OperatorAccessCode = {
      code: '3VKRD-6PXQA',
      kind: 'invite',
      label: 'Meetup Porto',
      owner: null,
      createdBy: sampleOperator,
      createdAt: FAKE_TIME,
      useLimit: 40,
      uses: 0,
      state: 'active',
      disabledAt: null,
      disabledBy: null,
    }
    server.json('POST', operatorCodesPath(), made, 201)
    const invites = fixtures.codes.filter((code) => code.kind === 'invite')
    server.json('GET', operatorCodesPath(), page([made, ...invites]))
    click(make)
    await settle()
    const body = '{"label":"Meetup Porto","useLimit":40}'
    expect({
      empty,
      filled,
      shown,
      open: queryByRole('dialog', 'New invite code'),
      first: codesBox(view).split(' Launch week')[0],
      requests: await operatorRequests(server),
    }).toEqual({
      empty: false,
      filled: true,
      shown: true,
      open: null,
      first: `Invite codes 7 invite codes, newest first. ${header} Meetup Porto by @calummoore · 15 Jan 3VKRD-6PXQA Active 0 of 40`,
      requests: [
        'GET /api/operator/invite-codes',
        `POST /api/operator/invite-codes ${body}`,
        `POST /api/operator/invite-codes ${body}`,
        'GET /api/operator/invite-codes',
      ],
    })
  })

  test('Disable asks first, names the code and who keeps app access, sends {}, and the row shows Disabled with no Copy join link or Disable', async () => {
    const server = new FakeApiServer()
    const fixtures = serveOperator(server)
    const lisbon = codeOf(fixtures.codes, 'TQ8WN-2HKXP')
    const path = operatorCodeDisablePath(lisbon.code)
    server.json('POST', path, disabledCode(lisbon, FAKE_TIME, sampleOperator))
    const { view } = await mountShell(server, routes.operatorCodes())
    click(byRole('button', 'Disable Meetup Lisbon'))
    const question = byRole('dialog', 'Disable Meetup Lisbon?')
    const asked = textOf(question.innerHTML)
    click(byRole('button', 'Disable code', question))
    await settle()
    expect({
      asked,
      row: codesBox(view).includes(
        'Meetup Lisbon by @ellie-w · 5 Jan TQ8WN-2HKXP Disabled 7 of 30',
      ),
      actions: [
        queryByRole('button', 'Copy the join link of TQ8WN-2HKXP'),
        queryByRole('button', 'Disable Meetup Lisbon'),
      ],
      requests: await operatorRequests(server),
    }).toEqual({
      asked:
        'Disable Meetup Lisbon? TQ8WN-2HKXP stops working now. The 7 people who used it keep their app access. Disable is final. To share a code again, make a new one. Cancel Disable code',
      row: true,
      actions: [null, null],
      requests: ['GET /api/operator/invite-codes', `POST ${path} {}`],
    })
  })

  test('on a phone, a row gives the code with its copy buttons under the label, and the state under the uses', async () => {
    const server = new FakeApiServer()
    serveOperator(server)
    const { view } = await mountShell(server, routes.operatorCodes(), {
      viewport: 'phone',
    })
    expect(codesBox(view).split(' Meetup Lisbon')[0]).toBe(
      'Invite codes 6 invite codes, newest first. Label Uses Launch week V7MKC-2QDXH 12 of 50 Active',
    )
  })
})
