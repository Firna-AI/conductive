// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import {
  opus,
  rows,
  triggerOf,
} from '../../chat/components/model-picker-test-kit'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { mount, press, pressKey } from '../../test-support/mount'
import { focused, Form, hover } from './model-picker-test-kit'
import { OverlayHost } from './Overlay'
import { ViewportProvider } from './viewport'

const favourites: readonly AgentChoice[] = [
  { agent: 'codex', model: 'sol', effort: 'high', fast: false },
]

/** The submenu of All models shows. */
function submenuShows(): boolean {
  return queryByRole('menu', 'All models') !== null
}

describe('All models in the model menu of the shell', () => {
  test('opens beside the menu with the right arrow and a press, with the focus on the current model, closes with the left arrow and Escape, which give the focus back to All models, and a pick changes the model', async () => {
    const changes: AgentChoice[] = []
    const view = await mount(
      <Form
        changes={changes}
        favourites={favourites}
        start={{ ...opus, model: 'sonnet' }}
      />,
    )
    await press(triggerOf(view))
    const start = focused()
    await pressKey('ArrowDown')
    await pressKey('ArrowRight')
    const opened = {
      focus: focused(),
      menu: queryByRole('menu', 'Model and effort') !== null,
      rows: rows('All models'),
    }
    await pressKey('ArrowDown')
    const moved = focused()
    await pressKey('ArrowLeft')
    const left = { focus: focused(), shows: submenuShows() }
    await press(byRole('menuitem', 'All models'))
    const pressed = focused()
    await pressKey('Escape')
    const escaped = {
      focus: focused(),
      shows: submenuShows(),
      menu: queryByRole('menu', 'Model and effort') !== null,
    }
    await pressKey('Escape')
    const closed = queryByRole('menu', 'Model and effort')
    await press(triggerOf(view))
    await press(byRole('menuitem', 'All models'))
    await press(byRole('menuitemradio', 'Opus 5.5'))
    expect({
      start,
      opened,
      moved,
      left,
      pressed,
      escaped,
      closed,
      changes,
      after: queryByRole('menu', 'Model and effort'),
    }).toEqual({
      start: 'GPT-6.1 Sol High',
      opened: {
        focus: 'Sonnet 5.5',
        menu: true,
        rows: [
          { role: 'menuitemradio', name: 'Opus 5.5', on: 'false' },
          { role: 'menuitemradio', name: 'Sonnet 5.5', on: 'true' },
          { role: 'menuitemradio', name: 'GPT-6.1 Sol', on: 'false' },
        ],
      },
      moved: 'GPT-6.1 Sol',
      left: { focus: 'All models', shows: false },
      pressed: 'Sonnet 5.5',
      escaped: { focus: 'All models', shows: false, menu: true },
      closed: null,
      changes: [opus],
      after: null,
    })
  })

  test('opens beside the menu at a hover of a mouse over All models, and a hover over another row closes it and takes the focus out of it, and a touch opens nothing', async () => {
    const view = await mount(<Form changes={[]} favourites={favourites} />)
    await press(triggerOf(view))
    await hover('All models', 'touch')
    const touched = submenuShows()
    await hover('All models', 'mouse')
    const hovered = { shows: submenuShows(), focus: focused() }
    await hover('Fast', 'mouse')
    const left = { shows: submenuShows(), focus: focused() }
    await press(byRole('menuitem', 'All models'))
    const inside = focused()
    await hover('Fast', 'mouse')
    expect({
      touched,
      hovered,
      left,
      inside,
      moved: { shows: submenuShows(), focus: focused() },
    }).toEqual({
      touched: false,
      hovered: { shows: true, focus: 'GPT-6.1 Sol High' },
      left: { shows: false, focus: 'GPT-6.1 Sol High' },
      inside: 'Opus 5.5',
      moved: { shows: false, focus: 'Fast' },
    })
  })

  test('in the phone layout opens the menu beside the picker, not in a sheet, and shows the list of All models in place of the menu, with Back at its top, which shows the menu again, as the left arrow does', async () => {
    const changes: AgentChoice[] = []
    const view = await mount(
      <ViewportProvider viewport="phone">
        <OverlayHost>
          <Form changes={changes} favourites={favourites} />
        </OverlayHost>
      </ViewportProvider>,
    )
    await press(triggerOf(view))
    const sheet = queryByRole('dialog', 'Model and effort')
    await press(byRole('menuitem', 'All models'))
    // Each step reads the rows that the next step presses.
    expect({
      sheet,
      menu: queryByRole('menu', 'Model and effort'),
      rows: rows('All models'),
      focus: focused(),
    }).toEqual({
      sheet: null,
      menu: null,
      rows: [
        { role: 'menuitem', name: 'Back', on: null },
        { role: 'menuitemradio', name: 'Opus 5.5', on: 'true' },
        { role: 'menuitemradio', name: 'Sonnet 5.5', on: 'false' },
        { role: 'menuitemradio', name: 'GPT-6.1 Sol', on: 'false' },
      ],
      focus: 'Opus 5.5',
    })
    await press(byRole('menuitem', 'Back'))
    const back = { shows: submenuShows(), focus: focused() }
    await pressKey('ArrowRight')
    await pressKey('ArrowLeft')
    expect({
      back,
      left: { shows: submenuShows(), focus: focused() },
    }).toEqual({
      back: { shows: false, focus: 'All models' },
      left: { shows: false, focus: 'All models' },
    })
    await press(byRole('menuitem', 'All models'))
    await press(byRole('menuitemradio', 'Sonnet 5.5'))
    expect(changes).toEqual([{ ...opus, model: 'sonnet' }])
  })
})
