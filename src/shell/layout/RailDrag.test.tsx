// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test } from 'vitest'
import { routes } from '../../app/router'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { press, settle } from '../test-mount'
import {
  layOutTiles,
  mountRail,
  mouse,
  orgMoves,
  orgOrder,
  railNames,
  railStatus,
  serveOrgChange,
  tileLink,
} from './rail-test-kit'

/** Whether a lifted copy of a tile shows above the page, outside the rail. */
function liftedTile(initials: string): boolean {
  return Array.from(
    document.querySelectorAll('body > [aria-hidden="true"]'),
  ).some((node) => node.textContent === initials)
}

describe('the drag of an org tile', () => {
  test('moves the faded tile of a deleted org to the place under the pointer, names no org during the drag, and opens nothing with the click at its end', async () => {
    const server = new FakeApiServer()
    // An admin still sees Firna, which an admin deleted, as a faded tile.
    serveOrgChange(server, 'firna', {
      deletion: { deletedAt: FAKE_TIME, deletesAt: FAKE_TIME + 604_800_000 },
    })
    const { navigation, view } = await mountRail(server)
    layOutTiles(view, ['acme', 'futex', 'firna'])
    const names = railNames(view)
    const firna = tileLink(view, 'firna')

    mouse(firna, 'pointerdown', { clientY: 97 })
    mouse(window, 'pointermove', { clientY: 92 })
    mouse(window, 'pointermove', { clientY: 10 })
    const during = {
      status: railStatus(view),
      names: railNames(view),
      lifted: liftedTile('FI'),
    }
    mouse(window, 'pointerup', { clientY: 10, buttons: 0 })
    act(() => firna.click())
    await settle()

    expect({
      names,
      during,
      moves: await orgMoves(server),
      order: orgOrder(view),
      status: railStatus(view),
      address: navigation.href(),
    }).toEqual({
      names: ['Acme', 'Futex', 'Firna'],
      during: {
        status: 'Moving Firna to place 1 of 3',
        names: [],
        lifted: true,
      },
      moves: [{ orgId: 'firna', index: 0 }],
      order: ['firna', 'acme', 'futex'],
      status: '',
      address: routes.org('acme'),
    })
  })

  test('keeps the order when Escape ends a drag, and a click without a move opens the org', async () => {
    const server = new FakeApiServer()
    const { navigation, view } = await mountRail(server)
    layOutTiles(view, ['acme', 'futex', 'firna'])
    const futex = tileLink(view, 'futex')

    mouse(futex, 'pointerdown', { clientY: 57 })
    mouse(window, 'pointermove', { clientY: 52 })
    mouse(window, 'pointermove', { clientY: 10 })
    const moving = railStatus(view)
    press(futex, 'Escape')
    const afterEscape = { status: railStatus(view), names: railNames(view) }
    mouse(window, 'pointerup', { clientY: 10, buttons: 0 })
    act(() => futex.click())
    const afterRelease = navigation.href()
    // A click whose pointer moves 2 px, less than a drag needs.
    mouse(futex, 'pointerdown', { clientY: 57 })
    mouse(window, 'pointermove', { clientY: 59 })
    mouse(window, 'pointerup', { clientY: 59, buttons: 0 })
    act(() => futex.click())
    await settle()

    expect({
      moving,
      afterEscape,
      afterRelease,
      moves: await orgMoves(server),
      order: orgOrder(view),
      address: navigation.href(),
    }).toEqual({
      moving: 'Moving Futex to place 1 of 3',
      afterEscape: { status: '', names: ['Acme', 'Futex', 'Firna'] },
      afterRelease: routes.org('acme'),
      moves: [],
      order: ['acme', 'futex', 'firna'],
      address: routes.org('futex'),
    })
  })
})
