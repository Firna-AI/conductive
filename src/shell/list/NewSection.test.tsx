// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import { sectionsPath } from '../../shared/sections'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import {
  coreFixtures,
  FAKE_IDS,
  fakeUser,
} from '../../test-support/fixtures/core'
import { click, mountScreen, press, settle, typeText } from '../test-mount'
import { startedApp } from '../test-render'
import { OverlayHost } from '../ui/Overlay'
import { OrgList } from './OrgList'

const org = FAKE_IDS.org
const review = {
  id: 'review',
  orgId: org,
  name: 'Review',
  position: 1,
  isDefault: false,
  collapsed: false,
}

/** The names of the sections, in the order that the list shows them. */
function order(view: HTMLElement): (string | null)[] {
  return Array.from(view.querySelectorAll('section[aria-label]')).map(
    (section) => section.getAttribute('aria-label'),
  )
}

/** The New section dialog, or `null` while it is closed. */
function dialog(): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    '[role="dialog"][aria-label="New section"]',
  )
}

async function mountList(server: FakeApiServer) {
  const app = await startedApp(server)
  await app.org(org).reload('list')
  const view = mountScreen(
    app,
    <OverlayHost>
      <OrgList
        orgId={org}
        selectedId={null}
        variant="sidebar"
        viewer={fakeUser}
      />
    </OverlayHost>,
  )
  await settle()
  return view
}

/** Opens New section from the menu of the section `name`. */
async function openFrom(view: HTMLElement, name: string): Promise<HTMLElement> {
  click(byRole('button', `More for ${name}`, view))
  click(byRole('menuitem', 'New section'))
  await settle()
  const open = dialog()
  if (!open) throw new Error('The New section dialog did not open.')
  return open
}

describe('New section', () => {
  test('the menu of a section opens a dialog whose name field has the focus, and Create section puts the new section directly below that section', async () => {
    const server = new FakeApiServer()
    server.json('POST', sectionsPath(org), { section: review }, 201)
    const view = await mountList(server)
    const open = await openFrom(view, 'General')
    const field = byRole('textbox', 'Name', open)
    const focused = field.contains(document.activeElement)
    const offOnEmpty = byRole('button', 'Create section', open)
    const emptyOff = offOnEmpty.getAttribute('aria-disabled')
    typeText(field, '  Review ')
    click(byRole('button', 'Create section', open))
    await settle()

    expect({
      focused,
      emptyOff,
      sent: await server.requests.at(-1)?.json(),
      open: dialog() !== null,
      order: order(view),
    }).toEqual({
      focused: true,
      emptyOff: 'true',
      sent: { name: 'Review', afterSectionId: 'general' },
      open: false,
      order: ['General', 'Review', 'Checkout', 'Infra'],
    })
  })

  test('a failed create shows in the dialog, which keeps the name, and Escape closes it with no write', async () => {
    const server = new FakeApiServer()
    server.json(
      'POST',
      sectionsPath(org),
      { error: { code: 'internal', message: 'The server is down.' } },
      500,
    )
    const view = await mountList(server)
    const before = server.requests.length
    const open = await openFrom(view, 'Checkout')
    const field = byRole('textbox', 'Name', open)
    typeText(field, 'Review')
    press(field, 'Enter')
    await settle()
    const failed = {
      open: dialog() !== null,
      notice: open.textContent?.includes('The server is down.'),
      kept: (field.querySelector('input') ?? field).getAttribute('value'),
      sent: await server.requests.at(-1)?.json(),
    }
    const writes = server.requests.length
    press(document.activeElement ?? document.body, 'Escape')
    await settle()

    expect({
      failed,
      closed: dialog() === null,
      writes: server.requests.length - writes,
      order: order(view),
      wrote: writes - before,
      menuGone: queryByRole('menuitem', 'New section') === null,
    }).toEqual({
      failed: {
        open: true,
        notice: true,
        kept: 'Review',
        sent: { name: 'Review', afterSectionId: 'checkout' },
      },
      closed: true,
      writes: 0,
      order: coreFixtures().sectionList.sections.map(({ name }) => name),
      wrote: 1,
      menuGone: true,
    })
  })
})
