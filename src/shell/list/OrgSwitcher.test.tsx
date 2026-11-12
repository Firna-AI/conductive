// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test } from 'vitest'
import type { AppModel } from '../../app/app-model'
import { routes } from '../../app/router'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { serveOperator } from '../../test-support/operator'
import { PhoneFrame } from '../layout/frames'
import { click, mountScreen, press } from '../test-mount'
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

  test('leaves out a deleted org, which the Account page lists', async () => {
    const sheet = await openSwitcher(new FakeApiServer(), (app) => {
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
})
