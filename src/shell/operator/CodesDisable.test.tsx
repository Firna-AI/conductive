// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { HeldRequests } from '../../app/test-kit'
import {
  operatorCodeDisablePath,
  operatorCodesPath,
} from '../../shared/operator-waitlist'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { sampleOperator } from '../../test-support/fixtures/operator'
import { disabledCode } from '../../test-support/fixtures/operator-access'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { serveOperator } from '../../test-support/operator'
import { click, settle, typeText } from '../test-mount'
import {
  codeOf,
  codeRows,
  codesBox,
  codesHeader,
  codesPage,
  madeCode,
} from './codes-test-kit'
import { mountShell, operatorRequests } from './operator-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** Disables the code with this name through its question. */
async function disableThrough(name: string): Promise<void> {
  click(byRole('button', `Disable ${name}`))
  click(byRole('button', 'Disable code', byRole('dialog', `Disable ${name}?`)))
  await settle()
}

describe('Disable on the Invite codes tab, while an older read runs', () => {
  test('a disabled code stays Disabled when an older Show more or the reload after New code answers last, and Show more keeps the newest total', async () => {
    const server = new FakeApiServer()
    const fixtures = serveOperator(server)
    const held = new HeldRequests(server)
    const invites = fixtures.codes.filter((code) => code.kind === 'invite')
    const first = { codes: invites.slice(0, 4), total: 6, nextCursor: 'p2' }
    server.json('GET', operatorCodesPath(), first)
    const next = { codes: invites.slice(4), total: 7, nextCursor: null }
    server.json('GET', operatorCodesPath({ cursor: 'p2' }), next)
    const lisbon = codeOf(fixtures.codes, 'TQ8WN-2HKXP')
    const lisbonOff = disabledCode(lisbon, FAKE_TIME, sampleOperator)
    server.json('POST', operatorCodeDisablePath(lisbon.code), lisbonOff)
    const friends = codeOf(fixtures.codes, '6FJDA-9RCVY')
    const friendsOff = disabledCode(friends, FAKE_TIME, sampleOperator)
    server.json('POST', operatorCodeDisablePath(friends.code), friendsOff)
    const { view } = await mountShell(server, routes.operatorCodes(), {
      services: { fetch: held.fetch },
    })
    held.holdAnswer('GET', operatorCodesPath())
    click(byRole('button', 'Show more'))
    await settle()
    await disableThrough('Meetup Lisbon')
    held.release('GET', operatorCodesPath())
    await settle()
    const paged = codesBox(view)
    server.json('POST', operatorCodesPath(), madeCode, 201)
    const known = invites.map((code) => (code === lisbon ? lisbonOff : code))
    server.json('GET', operatorCodesPath(), codesPage([madeCode, ...known]))
    click(byRole('button', 'New code'))
    const dialog = byRole('dialog', 'New invite code')
    const [label, limit] = Array.from(dialog.querySelectorAll('input'))
    typeText(label, 'Meetup Porto')
    typeText(limit, '40')
    held.holdAnswer('GET', operatorCodesPath())
    click(byRole('button', 'Make code', dialog))
    await settle()
    await disableThrough('Friends')
    held.release('GET', operatorCodesPath())
    await settle()
    const body = '{"label":"Meetup Porto","useLimit":40}'
    expect({
      paged,
      reloaded: codesBox(view),
      actions: [
        queryByRole('button', 'Disable Meetup Lisbon'),
        queryByRole('button', 'Disable Friends'),
      ],
      requests: await operatorRequests(server),
    }).toEqual({
      paged: [
        'Invite codes 7 invite codes, newest first.',
        codesHeader,
        codeRows[0],
        'Meetup Lisbon by @ellie-w · 5 Jan TQ8WN-2HKXP Disabled 7 of 30',
        ...codeRows.slice(2),
      ].join(' '),
      reloaded: [
        'Invite codes 7 invite codes, newest first.',
        codesHeader,
        'Meetup Porto by @calummoore · 15 Jan 3VKRD-6PXQA Active 0 of 40',
        codeRows[0],
        'Meetup Lisbon by @ellie-w · 5 Jan TQ8WN-2HKXP Disabled 7 of 30',
        ...codeRows.slice(2, 4),
        'Friends by @calummoore · 2 Jan 6FJDA-9RCVY Disabled 3 of 10',
        codeRows[5],
      ].join(' '),
      actions: [null, null],
      requests: [
        'GET /api/operator/invite-codes',
        'GET /api/operator/invite-codes?cursor=p2',
        `POST ${operatorCodeDisablePath(lisbon.code)} {}`,
        `POST /api/operator/invite-codes ${body}`,
        'GET /api/operator/invite-codes',
        `POST ${operatorCodeDisablePath(friends.code)} {}`,
      ],
    })
  })
})
