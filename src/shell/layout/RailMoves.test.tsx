// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test } from 'vitest'
import { API_PATHS } from '../../shared/api'
import { byRole, shownToasts } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { click, press, settle } from '../test-mount'
import {
  focused,
  layOutTiles,
  menuItems,
  menuPlace,
  mountRail,
  orgMoves,
  orgOrder,
  railStatus,
  rightClick,
  serveOrgChange,
  tileLink,
} from './rail-test-kit'

/** Presses Escape where the focus is, as the keyboard does. */
function escape() {
  press(document.activeElement ?? document.body, 'Escape')
}

describe('the tile menu and the keys of an org tile', () => {
  test('a right click opens the tile menu at the pointer, with Move up off on the first tile and Move down off on the last, and Create org keeps the menu of the browser', async () => {
    const { view } = await mountRail(new FakeApiServer())

    const browserOnAcme = rightClick(tileLink(view, 'acme'), {
      clientX: 30,
      clientY: 20,
    })
    const first = { items: menuItems('Acme'), place: menuPlace('Acme') }
    escape()
    rightClick(tileLink(view, 'firna'), { clientX: 30, clientY: 100 })
    const last = menuItems('Firna')
    escape()
    const browserOnCreate = rightClick(byRole('link', 'Create org', view), {
      clientX: 30,
      clientY: 140,
    })

    expect({
      browserOnAcme,
      first,
      last,
      browserOnCreate,
      menus: document.querySelectorAll('[role="menu"]').length,
    }).toEqual({
      browserOnAcme: false,
      first: {
        items: [
          { name: 'Move up', off: true },
          { name: 'Move down', off: false },
        ],
        place: { left: '30px', top: '20px' },
      },
      last: [
        { name: 'Move up', off: false },
        { name: 'Move down', off: true },
      ],
      browserOnCreate: true,
      menus: 0,
    })
  })

  test('Move up of the tile menu moves the tile one place, says its new place, and gives the focus back to the tile', async () => {
    const server = new FakeApiServer()
    const { view } = await mountRail(server)

    rightClick(tileLink(view, 'firna'), { clientX: 30, clientY: 100 })
    click(byRole('menuitem', 'Move up'))
    await settle()

    expect({
      moves: await orgMoves(server),
      order: orgOrder(view),
      status: railStatus(view),
      focus: focused(),
      menu: menuItems('Firna'),
    }).toEqual({
      moves: [{ orgId: 'firna', index: 1 }],
      order: ['acme', 'firna', 'futex'],
      status: 'Firna moves to place 2 of 3',
      focus: 'Firna',
      menu: [],
    })
  })

  test('a move that the server refuses goes back, names the failure in a toast, and says no new place', async () => {
    const server = new FakeApiServer()
    server.json(
      'PUT',
      API_PATHS.orgOrder,
      { error: { code: 'save_failed', message: 'Try again.' } },
      503,
    )
    const { view } = await mountRail(server)
    const firna = tileLink(view, 'firna')
    act(() => firna.focus())

    press(firna, 'ArrowUp', { alt: true })
    const shown = { order: orgOrder(view), status: railStatus(view) }
    await settle()

    expect({
      shown,
      order: orgOrder(view),
      status: railStatus(view),
      toasts: shownToasts().map((toast) => toast.textContent),
    }).toEqual({
      shown: {
        order: ['acme', 'firna', 'futex'],
        status: 'Firna moves to place 2 of 3',
      },
      order: ['acme', 'futex', 'firna'],
      status: '',
      toasts: ["The org didn't move.Try again."],
    })
  })

  test('Shift and F10 open the tile menu beside a focused tile, and Alt and Up or Down move a suspended tile one place with the focus on it, while Alt with Shift moves nothing', async () => {
    const server = new FakeApiServer()
    serveOrgChange(server, 'futex', { suspension: { suspendedAt: FAKE_TIME } })
    const { view } = await mountRail(server)
    // The tile of Futex spans 7 to 41 px across and 40 to 74 px down.
    layOutTiles(view, ['acme', 'futex', 'firna'])
    const futex = tileLink(view, 'futex')
    act(() => futex.focus())

    const menuKey = press(futex, 'F10', { shift: true })
    const menu = { items: menuItems('Futex'), place: menuPlace('Futex') }
    escape()
    const afterMenu = focused()
    const withShift = press(futex, 'ArrowUp', { alt: true, shift: true })
    const orderWithShift = orgOrder(view)
    press(futex, 'ArrowDown', { alt: true })
    await settle()
    const down = {
      order: orgOrder(view),
      status: railStatus(view),
      focus: focused(),
    }
    press(document.activeElement ?? document.body, 'ArrowUp', { alt: true })
    await settle()

    expect({
      menuKeyStopped: menuKey.defaultPrevented,
      menu,
      afterMenu,
      withShift: { stopped: withShift.defaultPrevented, order: orderWithShift },
      down,
      up: { order: orgOrder(view), status: railStatus(view), focus: focused() },
      moves: await orgMoves(server),
    }).toEqual({
      menuKeyStopped: true,
      menu: {
        items: [
          { name: 'Move up', off: false },
          { name: 'Move down', off: false },
        ],
        place: { left: '49px', top: '40px' },
      },
      afterMenu: 'Futex, suspended',
      withShift: { stopped: false, order: ['acme', 'futex', 'firna'] },
      down: {
        order: ['acme', 'firna', 'futex'],
        status: 'Futex moves to place 3 of 3',
        focus: 'Futex, suspended',
      },
      up: {
        order: ['acme', 'futex', 'firna'],
        status: 'Futex moves to place 2 of 3',
        focus: 'Futex, suspended',
      },
      moves: [
        { orgId: 'futex', index: 2 },
        { orgId: 'futex', index: 1 },
      ],
    })
  })
})
