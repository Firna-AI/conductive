// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import type { AppModel } from '../../app/app-model'
import { routes } from '../../app/router'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { serveOperator } from '../../test-support/operator'
import { PhoneFrame } from '../layout/frames'
import { orgMoves, orgOrder } from '../layout/rail-test-kit'
import { click, mountScreen, press, settle } from '../test-mount'
import { startedApp } from '../test-render'
import { ListHeader } from './HomeList'

/**
 * Opens the org switcher of Acme on a phone, and gives its sheet. `prepare`
 * changes the app before the switcher mounts.
 */
async function openSwitcher(
  server: FakeApiServer,
  prepare: (app: AppModel) => void = () => undefined,
): Promise<HTMLElement> {
  const app = await startedApp(server)
  prepare(app)
  const boot = app.boot.get()
  const [org] = app.orgs.get()
  if (boot.state !== 'ready' || !org) throw new Error('The app did not start.')
  const view = mountScreen(
    app,
    <PhoneFrame>
      <ListHeader org={org} settings={false} user={boot.user} />
    </PhoneFrame>,
    { viewport: 'phone' },
  )
  const trigger = view.querySelector<HTMLElement>('[aria-haspopup="dialog"]')
  if (!trigger) throw new Error('The switcher has no trigger.')
  click(trigger)
  const sheet = document.querySelector<HTMLElement>('[role="dialog"]')
  if (!sheet) throw new Error('The switcher did not open.')
  return sheet
}

/** Sends a pointer event with the main button down, unless `init` says otherwise. */
function pointer(target: EventTarget, type: string, init: PointerEventInit) {
  act(() => {
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        button: 0,
        buttons: 1,
        clientX: 100,
        ...init,
      }),
    )
  })
}

/** The link of the row of an org in the sheet. */
function orgRow(sheet: HTMLElement, orgId: string): HTMLElement {
  const link = sheet.querySelector<HTMLElement>(
    `a[href="${routes.org(orgId)}"]`,
  )
  if (!link) throw new Error(`The switcher has no row for ${orgId}.`)
  return link
}

/**
 * Gives the list item of the row of each org a box 48 px high, from the top,
 * in this order. So the middles of the rows are at 24, 72, and 120 px.
 */
function layOutRows(sheet: HTMLElement, orgIds: readonly string[]) {
  orgIds.forEach((orgId, index) => {
    const item = orgRow(sheet, orgId).closest('li')
    if (!item) throw new Error(`The row of ${orgId} has no list item.`)
    const box = new DOMRect(0, index * 48, 320, 48)
    Object.defineProperty(item, 'getBoundingClientRect', {
      configurable: true,
      value: () => box,
    })
  })
}

describe('the org switcher of a phone', () => {
  test.each([
    {
      outcome: 'lists Operator under Account',
      who: 'an operator',
      operator: true,
      last: ['/account', '/operator'],
    },
    {
      outcome: 'lists no Operator',
      who: 'anyone else',
      operator: false,
      last: ['/orgs/new', '/account'],
    },
  ])('$outcome for $who', async (row) => {
    const server = new FakeApiServer()
    if (row.operator) serveOperator(server)
    const sheet = await openSwitcher(server)
    const links = Array.from(sheet.querySelectorAll('a'), (link) =>
      link.getAttribute('href'),
    )
    expect(links.slice(-2)).toEqual(row.last)
  })

  test('leaves out a deleted org and saves a move past it in the full membership order', async () => {
    const server = new FakeApiServer()
    const sheet = await openSwitcher(server, (app) => {
      const futex = app.orgs.get().find((item) => item.id === 'futex')
      if (!futex) throw new Error('The app has no Futex.')
      app.putOrg({
        ...futex,
        deletion: { deletedAt: FAKE_TIME, deletesAt: FAKE_TIME + 1 },
      })
    })
    const links = Array.from(sheet.querySelectorAll('a'), (link) =>
      link.getAttribute('href'),
    )
    expect(links.slice(0, 2)).toEqual([routes.org('acme'), routes.org('firna')])
    layOutRows(sheet, ['acme', 'firna'])
    const acme = orgRow(sheet, 'acme')
    pointer(acme, 'pointerdown', { pointerType: 'mouse', clientY: 24 })
    pointer(window, 'pointermove', { pointerType: 'mouse', clientY: 30 })
    pointer(window, 'pointermove', { pointerType: 'mouse', clientY: 80 })
    pointer(window, 'pointerup', {
      pointerType: 'mouse',
      clientY: 80,
      buttons: 0,
    })
    await settle()
    expect(orgOrder(sheet)).toEqual(['firna', 'acme'])
    expect(await orgMoves(server)).toEqual([{ orgId: 'acme', index: 2 }])
  })

  test('keeps Tab and Shift+Tab inside, also from the sheet itself, and gives the focus back to its trigger, also after a press outside', async () => {
    const app = await startedApp(new FakeApiServer())
    const boot = app.boot.get()
    const [org] = app.orgs.get()
    if (boot.state !== 'ready' || !org)
      throw new Error('The app did not start.')
    const view = mountScreen(
      app,
      <PhoneFrame>
        <ListHeader org={org} settings={false} user={boot.user} />
      </PhoneFrame>,
      { viewport: 'phone' },
    )
    const trigger = view.querySelector<HTMLElement>('[aria-haspopup="dialog"]')
    if (!trigger) throw new Error('The switcher has no trigger.')
    click(trigger)
    const sheet = document.querySelector<HTMLElement>('[role="dialog"]')
    if (!sheet) throw new Error('The switcher did not open.')
    const links = [...sheet.querySelectorAll('a')]
    const focused = () =>
      links.findIndex((link) => link === document.activeElement)
    const behind = () => trigger.closest('[inert]') !== null
    const opened = { links: links.length, focus: focused(), behind: behind() }
    press(links[0], 'Tab', { shift: true })
    const fromFirst = focused()
    sheet.focus()
    press(sheet, 'Tab', { shift: true })
    const fromSheet = focused()
    press(links[links.length - 1], 'Tab')
    const fromLast = focused()
    press(links[0], 'Escape')
    const closed = {
      open: document.querySelector('[role="dialog"]') !== null,
      behind: behind(),
      trigger: document.activeElement === trigger,
    }
    click(trigger)
    // A browser moves the focus at a press that the app does not keep.
    const outside = new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
    })
    act(() => {
      document.body.dispatchEvent(outside)
    })
    expect({
      opened,
      fromFirst,
      fromSheet,
      fromLast,
      closed,
      pressedOutside: {
        open: document.querySelector('[role="dialog"]') !== null,
        pressKept: outside.defaultPrevented,
        trigger: document.activeElement === trigger,
      },
    }).toEqual({
      opened: { links: 5, focus: 0, behind: true },
      fromFirst: 4,
      fromSheet: 4,
      fromLast: 0,
      closed: { open: false, behind: false, trigger: true },
      pressedOutside: { open: false, pressKept: true, trigger: true },
    })
  })

  test('a long press lifts an org and opens no menu, the finger drops it at a new place and the sheet stays, and Escape ends a drag and keeps the sheet', async () => {
    const server = new FakeApiServer()
    const sheet = await openSwitcher(server)
    layOutRows(sheet, ['acme', 'futex', 'firna'])
    const status = () =>
      sheet.querySelector('nav > [role="status"]')?.textContent ?? ''
    const shows = () => ({
      open: document.querySelector('[role="dialog"]') !== null,
      menus: document.querySelectorAll('[role="menu"]').length,
    })
    const firna = orgRow(sheet, 'firna')
    const finger = { pointerType: 'touch', pointerId: 2 }
    const hold = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
    })
    vi.useFakeTimers()
    let lifted: { held: string; moving: string }
    try {
      pointer(firna, 'pointerdown', { ...finger, clientY: 120 })
      act(() => vi.advanceTimersByTime(450))
      const held = status()
      act(() => {
        firna.dispatchEvent(hold)
      })
      pointer(window, 'pointermove', { ...finger, clientY: 10 })
      const moving = status()
      pointer(window, 'pointerup', { ...finger, clientY: 10, buttons: 0 })
      // A finger sends its click after it lets go.
      act(() => firna.click())
      lifted = { held, moving }
    } finally {
      vi.useRealTimers()
    }
    await settle()
    const dropped = { order: orgOrder(sheet), ...shows() }

    // A mouse lifts Acme, whose box stays at the top, and moves it down.
    const acme = orgRow(sheet, 'acme')
    pointer(acme, 'pointerdown', { pointerType: 'mouse', clientY: 24 })
    pointer(window, 'pointermove', { pointerType: 'mouse', clientY: 30 })
    pointer(window, 'pointermove', { pointerType: 'mouse', clientY: 130 })
    const moving = status()
    press(document.activeElement ?? document.body, 'Escape')
    const escaped = { moving, status: status(), ...shows() }
    pointer(window, 'pointerup', { pointerType: 'mouse', buttons: 0 })
    await settle()

    expect({
      lifted,
      holdMenuStopped: hold.defaultPrevented,
      dropped,
      escaped,
      order: orgOrder(sheet),
      moves: await orgMoves(server),
    }).toEqual({
      lifted: {
        held: 'Moving Firna to place 3 of 3',
        moving: 'Moving Firna to place 1 of 3',
      },
      holdMenuStopped: true,
      dropped: { order: ['firna', 'acme', 'futex'], open: true, menus: 0 },
      escaped: {
        moving: 'Moving Acme to place 3 of 3',
        status: '',
        open: true,
        menus: 0,
      },
      order: ['firna', 'acme', 'futex'],
      moves: [{ orgId: 'firna', index: 0 }],
    })
  })
})
