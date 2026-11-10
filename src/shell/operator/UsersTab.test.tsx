// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import {
  operatorUsersPath,
  type OperatorUsersResponse,
} from '../../shared/operator'
import { byText } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { userRow } from '../../test-support/fixtures/operator'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { serveOperator } from '../../test-support/operator'
import { click, settle } from '../test-mount'
import { textOf } from '../test-render'
import { mountShell } from './operator-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** The text of the box of the rows: its line, and its rows. */
function usersBox(view: HTMLElement): string {
  return textOf(view.querySelector('main section')?.innerHTML ?? '')
}

describe('the Users tab of the operator section', () => {
  test('lists the newest users with their count, the state of a suspended user or of a person who waits or else the name, and links to their pages', async () => {
    const server = new FakeApiServer()
    serveOperator(server)
    const { view } = await mountShell(server, routes.operatorUsers())
    const box = usersBox(view)
    click(byText('@dana-k'))
    await settle()
    expect({
      box,
      opened: view.querySelector('main h1')?.textContent,
    }).toEqual({
      box: [
        'Users 24 users, newest first. User Joined Orgs Workspaces',
        'RO @rho-9 Rhea Okafor 15 Jan 1 2',
        'Z @zed-k Waiting 15 Jan 0 0',
        'SO @tide-sam Sam Ortiz 14 Jan 1 3',
        'BV @bram-v Waiting 11 Jan 0 0',
        'AP @ana-p Ana Pereira 10 Jan 1 3',
        'JQ @joe-q Joe Quinn 10 Jan 1 1',
        'SH @samir-h Waiting 8 Jan 0 0',
        'LH @lena-h Waiting 7 Jan 0 0',
        'OP @ovi-dev Waiting 6 Jan 0 0',
        'NQ @nadia-q Waiting 5 Jan 0 0',
        'KT @kt-null Kai Tanaka 4 Jan 2 2',
        'KW @kenji-w Waiting 4 Jan 0 0',
        'V @vex-ops 4 Jan 1 6',
        'P @pkwan Waiting 3 Jan 0 0',
        'JM @jules-m Waiting 2 Jan 0 0',
        'SO @sam-okafor Waiting 1 Jan 0 0',
        'DK @dana-k Suspended 28 Dec 2026 2 14',
        'MS @mira-s Mira Santos 10 Dec 2026 3 23',
        'LW @li-wei Li Wei 27 Sept 2026 3 31',
        'TR @tomas-r Tomás Ruiz 12 Sept 2026 3 48',
        'DB @danny-b Danny Brooks 7 Sept 2026 2 9',
        'PR @priyaraman Priya Raman 30 Aug 2026 1 5',
        'JW @jonasweber Jonas Weber 30 Aug 2026 1 4',
        'C @calummoore Cal 28 Aug 2026 3 41',
      ].join(' '),
      opened: '@dana-k',
    })
  })

  test('counts the matches of a search, and a search with no match says what the search finds', async () => {
    const server = new FakeApiServer()
    const fixtures = serveOperator(server)
    const dan = fixtures.users.filter((user) => user.login.startsWith('dan'))
    server.json('GET', operatorUsersPath({ q: 'dan' }), {
      users: dan.map(userRow),
      total: dan.length,
      nextCursor: null,
    } satisfies OperatorUsersResponse)
    server.json('GET', operatorUsersPath({ q: 'ghost-user' }), {
      users: [],
      total: 0,
      nextCursor: null,
    } satisfies OperatorUsersResponse)
    const found = await mountShell(server, routes.operatorUsers('dan'))
    const none = await mountShell(server, routes.operatorUsers('ghost-user'))
    expect({
      found: usersBox(found.view),
      none: usersBox(none.view),
    }).toEqual({
      found:
        'Users 2 users match “dan”. User Joined Orgs Workspaces DK @dana-k Suspended 28 Dec 2026 2 14 DB @danny-b Danny Brooks 7 Sept 2026 2 9',
      none: 'Users Search by GitHub login, name, or GitHub ID. No user matches “ghost-user”.',
    })
  })
})
