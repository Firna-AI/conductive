// @vitest-environment happy-dom

import { act, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, onTestFinished, test, vi } from 'vitest'
import { LayersContext, OpenLayers } from '../ui/layers'
import { press } from '../test-mount'
import { usePageEscape } from './page-escape'
import { ShortcutContext, type ShortcutLayer } from './shortcut-context'
import { ShortcutOffers } from './shortcut-offers'

/**
 * The page of the test: a button, a text field, a message field with the
 * button of a chip, and a terminal.
 */
function Page(props: { run: (() => void) | null }) {
  usePageEscape(props.run)
  return (
    <>
      <button type="button">Row</button>
      <input aria-label="Search" type="text" />
      <div contentEditable suppressContentEditableWarning>
        <span contentEditable={false}>
          <button type="button">Remove</button>
        </span>
      </div>
      <div data-terminal="">
        <button type="button">Screen</button>
      </div>
    </>
  )
}

/**
 * Mounts the page with its shortcut layer and its open layers. `run`
 * counts each Escape action.
 */
function mountPage(active = true) {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const layers = new OpenLayers()
  const shortcuts: ShortcutLayer = {
    offers: new ShortcutOffers(),
    terminals: new Set(),
    recorders: new Set(),
    keymap: new Map(),
  }
  const run = vi.fn()
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const render = (page: ReactNode) =>
    act(() => {
      root.render(
        <ShortcutContext.Provider value={shortcuts}>
          <LayersContext.Provider value={layers}>{page}</LayersContext.Provider>
        </ShortcutContext.Provider>,
      )
    })
  render(<Page run={active ? run : null} />)
  onTestFinished(() => {
    act(() => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
  })
  const terminal = container.querySelector<HTMLElement>('[data-terminal]')
  if (terminal) shortcuts.terminals.add(terminal)
  const element = (selector: string) => {
    const found = container.querySelector<HTMLElement>(selector)
    if (!found) throw new Error(`No ${selector} on the page.`)
    return found
  }
  return {
    run,
    layers,
    shortcuts,
    row: element('button'),
    field: element('input'),
    screen: element('[data-terminal] button'),
    chip: element('[contenteditable="false"] button'),
    hide: () => render(<Page run={null} />),
  }
}

/** Whether the press stopped the default action, and the actions it ran. */
function escapeOn(target: EventTarget, run: { mock: { calls: unknown[] } }) {
  const before = run.mock.calls.length
  const event = press(target, 'Escape')
  return {
    prevented: event.defaultPrevented,
    runs: run.mock.calls.length - before,
  }
}

describe('Escape as the fixed key of the page', () => {
  test('Escape from the page runs the action once and stops its default action, and a key with a modifier, another key, or no offer runs nothing', () => {
    const page = mountPage()
    const free = escapeOn(page.row, page.run)
    const shifted = press(page.row, 'Escape', { shift: true })
    const other = press(page.row, 'Enter')
    const runs = page.run.mock.calls.length
    page.hide()
    const hidden = escapeOn(page.row, page.run)

    expect({
      free,
      shifted: shifted.defaultPrevented,
      other: other.defaultPrevented,
      runs,
      hidden,
    }).toEqual({
      free: { prevented: true, runs: 1 },
      shifted: false,
      other: false,
      runs: 1,
      hidden: { prevented: false, runs: 0 },
    })
  })

  test('a text field, a button of a chip in the message field, a terminal, an open menu, an open dialog, and a recorder keep Escape', () => {
    const page = mountPage()
    const field = escapeOn(page.field, page.run)
    const chip = escapeOn(page.chip, page.run)
    const screen = escapeOn(page.screen, page.run)
    const closeMenu = page.layers.addMenu(() => true)
    const menu = escapeOn(page.row, page.run)
    closeMenu()
    const closeDialog = page.layers.addModal()
    const dialog = escapeOn(page.row, page.run)
    closeDialog()
    page.shortcuts.recorders.add(page.field)
    const recorder = escapeOn(page.row, page.run)
    page.shortcuts.recorders.clear()

    expect({ field, chip, screen, menu, dialog, recorder }).toEqual({
      field: { prevented: false, runs: 0 },
      chip: { prevented: false, runs: 0 },
      screen: { prevented: false, runs: 0 },
      menu: { prevented: false, runs: 0 },
      dialog: { prevented: false, runs: 0 },
      recorder: { prevented: false, runs: 0 },
    })
  })

  test('a menu that a handler closes during the press still keeps Escape, as it was open when the press started', () => {
    const page = mountPage()
    let closeMenu: (() => void) | null = page.layers.addMenu(() => true)
    const onKey = () => {
      closeMenu?.()
      closeMenu = null
    }
    document.addEventListener('keydown', onKey, true)
    onTestFinished(() => document.removeEventListener('keydown', onKey, true))

    expect({
      closing: escapeOn(page.row, page.run),
      next: escapeOn(page.row, page.run),
    }).toEqual({
      closing: { prevented: false, runs: 0 },
      next: { prevented: true, runs: 1 },
    })
  })

  test('a handler of the window that takes Escape keeps it, such as a drag that starts after the offer, and a press that a handler stops runs nothing and leaves the next press its action', () => {
    const page = mountPage()
    // As a drag does: its listener comes after the offer, and it takes Escape.
    const drag = (event: KeyboardEvent) => event.preventDefault()
    window.addEventListener('keydown', drag)
    const dragged = escapeOn(page.row, page.run)
    window.removeEventListener('keydown', drag)
    const stop = (event: KeyboardEvent) => event.stopPropagation()
    page.row.addEventListener('keydown', stop)
    const stopped = escapeOn(page.row, page.run)
    page.row.removeEventListener('keydown', stop)
    window.addEventListener('keydown', drag)
    const draggedAfterStop = escapeOn(page.row, page.run)
    window.removeEventListener('keydown', drag)

    expect({
      dragged,
      stopped,
      draggedAfterStop,
      next: escapeOn(page.row, page.run),
    }).toEqual({
      dragged: { prevented: true, runs: 0 },
      stopped: { prevented: false, runs: 0 },
      draggedAfterStop: { prevented: true, runs: 0 },
      next: { prevented: true, runs: 1 },
    })
  })
})
