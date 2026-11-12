// @vitest-environment happy-dom

import { useRef } from 'react'
import { expect, test } from 'vitest'
import { byRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { mountScreen, press } from '../test-mount'
import { startedApp } from '../test-render'
import { ResizeHandle } from './ResizeHandle'

/** The sidebar with its divider, as the desktop frame draws it. */
function Sidebar() {
  const sidebar = useRef<HTMLElement>(null)
  return (
    <aside ref={sidebar}>
      <ResizeHandle
        edge="right"
        label="Resize the sidebar"
        panel="sidebar"
        panelRef={sidebar}
      />
    </aside>
  )
}

test('a focused divider moves only on its own keys, so the keys of Previous tab stay free for the shortcut', async () => {
  const app = await startedApp(new FakeApiServer())
  const view = mountScreen(app, <Sidebar />)
  const divider = byRole('separator', 'Resize the sidebar', view)
  divider.focus()
  const presses = [
    { name: '⌥⌘←', key: 'ArrowLeft', modifiers: { alt: true, meta: true } },
    {
      name: 'Alt+Shift+←',
      key: 'ArrowLeft',
      modifiers: { alt: true, shift: true },
    },
    { name: 'Shift+Home', key: 'Home', modifiers: { shift: true } },
    { name: '←', key: 'ArrowLeft', modifiers: {} },
    { name: 'Shift+←', key: 'ArrowLeft', modifiers: { shift: true } },
  ]
  const moved = presses.map(({ name, key, modifiers }) => {
    const before = divider.getAttribute('aria-valuenow')
    press(divider, key, modifiers)
    return [name, divider.getAttribute('aria-valuenow') !== before]
  })
  expect(Object.fromEntries(moved)).toEqual({
    '⌥⌘←': false,
    'Alt+Shift+←': false,
    'Shift+Home': false,
    '←': true,
    'Shift+←': true,
  })
})
