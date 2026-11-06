// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import { FakeApiServer } from '../../test-support/fake-api'
import { click, mountScreen, press } from '../test-mount'
import { startedApp } from '../test-render'
import { MenuButton, type MenuEntry } from './Menu'
import { OverlayHost } from './Overlay'
import type { Viewport } from './viewport'

const entries: readonly MenuEntry[] = [
  { kind: 'item', label: 'Rename', onSelect: () => undefined },
  { kind: 'item', label: 'Delete section', onSelect: () => undefined },
]

/** Opens the menu of a section, and reports the focus and the page behind it. */
async function openMenu(viewport: Viewport) {
  const app = await startedApp(new FakeApiServer())
  const view = mountScreen(
    app,
    <OverlayHost>
      <MenuButton
        entries={entries}
        label="Checkout menu"
        trigger={(state) => (
          <button
            aria-expanded={state.open}
            onClick={state.toggle}
            type="button"
          >
            More
          </button>
        )}
      />
    </OverlayHost>,
    { viewport },
  )
  const trigger = view.querySelector('button')
  if (!trigger) throw new Error('The menu has no trigger.')
  click(trigger)
  const opened = {
    focus: document.activeElement?.textContent,
    behind: trigger.closest('[inert]') !== null,
  }
  press(document.activeElement ?? trigger, 'Escape')
  return {
    opened,
    closed: {
      behind: trigger.closest('[inert]') !== null,
      trigger: document.activeElement === trigger,
    },
  }
}

describe('menus', () => {
  test('a desktop menu keeps the page behind it active, and a phone menu holds it until the focus is back on the trigger', async () => {
    expect({
      desktop: await openMenu('desktop'),
      phone: await openMenu('phone'),
    }).toEqual({
      desktop: {
        opened: { focus: 'Rename', behind: false },
        closed: { behind: false, trigger: true },
      },
      phone: {
        opened: { focus: 'Rename', behind: true },
        closed: { behind: false, trigger: true },
      },
    })
  })
})
