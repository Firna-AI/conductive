// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test } from 'vitest'
import { groupWorkspaces } from '../../app/sections'
import type { Section } from '../../shared/sections'
import { sectionPath } from '../../shared/sections'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import {
  coreFixtures,
  FAKE_IDS,
  FAKE_TIME,
  fakeUser,
} from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { click, mountScreen, settle } from '../test-mount'
import { startedApp } from '../test-render'
import { OrgList } from './OrgList'
import type { SectionActions } from './SectionHeader'
import { SectionList } from './SectionList'

const org = FAKE_IDS.org
const sections = coreFixtures().sectionList.sections

/** The names of the sections, in the order that the list shows them. */
function order(view: HTMLElement): (string | null)[] {
  return Array.from(view.querySelectorAll('section[aria-label]')).map(
    (section) => section.getAttribute('aria-label'),
  )
}

/** The button with the name of a section, which collapses it. */
function toggle(view: HTMLElement, name: string): HTMLElement {
  const found = view.querySelector<HTMLElement>(
    `section[aria-label="${name}"] h3 button`,
  )
  if (!found) throw new Error(`The list has no section ${name}.`)
  return found
}

/** Gives the section a box `height` px high, `top` px down the page. */
function placeAt(view: HTMLElement, name: string, top: number, height = 100) {
  const element = view.querySelector(`section[aria-label="${name}"]`)
  if (!element) throw new Error(`The list has no section ${name}.`)
  const box = new DOMRect(0, top, 200, height)
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => box,
  })
}

/** Sends a mouse event with the button down, unless `init` says otherwise. */
function mouse(target: EventTarget, type: string, init: PointerEventInit) {
  act(() => {
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        buttons: 1,
        clientX: 100,
        ...init,
      }),
    )
  })
}

describe('the move of a section', () => {
  test('the menu offers only the moves that exist, and Move section up sends the new place, shows it at once, and keeps the focus on the menu button', async () => {
    const server = new FakeApiServer()
    const infra = sections[2]
    server.json('PATCH', sectionPath(org, 'infra'), {
      section: { ...infra, position: 1 },
    })
    const app = await startedApp(server)
    await app.org(org).reload('list')
    const view = mountScreen(
      app,
      <OrgList
        orgId={org}
        selectedId={null}
        variant="sidebar"
        viewer={fakeUser}
      />,
    )
    await settle()
    const items = (name: string) => {
      click(byRole('button', `More for ${name}`, view))
      const shown = {
        up: queryByRole('menuitem', 'Move section up') !== null,
        down: queryByRole('menuitem', 'Move section down') !== null,
      }
      click(byRole('button', `More for ${name}`, view))
      return shown
    }
    const offered = { general: items('General'), infra: items('Infra') }

    click(byRole('button', 'More for Infra', view))
    click(byRole('menuitem', 'Move section up'))
    const shownAtOnce = order(view)
    await settle()

    expect({
      offered,
      shownAtOnce,
      sent: await server.requests.at(-1)?.json(),
      confirmed: order(view),
      focus: document.activeElement?.getAttribute('aria-label'),
      said: view.querySelector('[role="status"]')?.textContent,
    }).toEqual({
      offered: {
        general: { up: false, down: true },
        infra: { up: true, down: false },
      },
      shownAtOnce: ['General', 'Infra', 'Checkout'],
      sent: { position: 1 },
      confirmed: ['General', 'Infra', 'Checkout'],
      focus: 'More for Infra',
      said: 'Infra moves to place 2.',
    })
  })

  test('a drag of the name of a section moves it to the place under the pointer, a drop at its own place moves nothing, and only a click with no drag collapses it', async () => {
    const app = await startedApp(new FakeApiServer())
    const groups = groupWorkspaces(
      sections,
      workspaceFixtures().workspaces.workspaces,
    )
    const moves: { section: string; index: number }[] = []
    const toggled: string[] = []
    const actions: SectionActions = {
      toggle: (section: Section) => toggled.push(section.id),
      rename: () => {},
      moveTo: (section, index) => moves.push({ section: section.id, index }),
      newWorkspace: () => {},
      newSection: () => {},
      remove: () => {},
    }
    const view = mountScreen(
      app,
      <SectionList
        actions={actions}
        archived={groups.archived}
        groups={groups.sections}
        move={() => {}}
        now={FAKE_TIME}
        readOnly={false}
        selectedId={null}
        variant="sidebar"
      />,
    )
    // General spans 0 to 100 px, Checkout 120 to 220 px, and Infra 240 to
    // 260 px. Their middles are at 50, 170, and 250 px.
    placeAt(view, 'General', 0)
    placeAt(view, 'Checkout', 120)
    placeAt(view, 'Infra', 240, 20)
    /** What the drop line says to a screen reader, while a drag lasts. */
    const status = () =>
      Array.from(view.querySelectorAll('[role="status"]'))
        .map((element) => element.textContent)
        .find((text) => text?.startsWith('Moving')) ?? null

    // Infra goes above General, then back to its own place.
    mouse(toggle(view, 'Infra'), 'pointerdown', { clientY: 250 })
    mouse(window, 'pointermove', { clientY: 256 })
    mouse(window, 'pointermove', { clientY: 20 })
    const aboveGeneral = status()
    mouse(window, 'pointermove', { clientY: 250 })
    mouse(window, 'pointerup', { clientY: 250, buttons: 0 })
    click(toggle(view, 'Infra'))
    // General goes between Checkout and Infra.
    mouse(toggle(view, 'General'), 'pointerdown', { clientY: 10 })
    mouse(window, 'pointermove', { clientY: 16 })
    mouse(window, 'pointermove', { clientY: 200 })
    const betweenCheckoutAndInfra = status()
    mouse(window, 'pointerup', { clientY: 200, buttons: 0 })
    click(toggle(view, 'General'))
    // A click with no drag collapses General.
    click(toggle(view, 'General'))

    expect({
      aboveGeneral,
      betweenCheckoutAndInfra,
      afterDrop: status(),
      moves,
      toggled,
    }).toEqual({
      aboveGeneral: 'Moving Infra to place 1',
      betweenCheckoutAndInfra: 'Moving General to place 2',
      afterDrop: null,
      moves: [{ section: 'general', index: 1 }],
      toggled: ['general'],
    })
  })
})
