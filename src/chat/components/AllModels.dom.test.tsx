// @vitest-environment happy-dom
import { act } from 'react'
import { describe, expect, it } from 'vitest'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import { TouchScreen } from '../../ui/components/common/touch'
import {
  accessibleName,
  byRole,
  queryByRole,
} from '../../test-support/dom-queries'
import { mount, press, pressKey } from '../../test-support/mount'
import {
  choiceSaying,
  opus,
  rows,
  Session,
  spokenChoices,
  triggerOf,
} from './model-picker-test-kit'

const favourites: readonly AgentChoice[] = [
  opus,
  { agent: 'codex', model: 'sol', effort: 'high', fast: false },
]

/** What a screen reader says for the element with the focus. */
function focused(): string {
  return accessibleName(document.activeElement ?? document.body)
}

/** The submenu of All models shows. */
function submenuShows(): boolean {
  return queryByRole('menu', 'All models') !== null
}

/** Moves a pointer of `pointerType` over a row of the open model menu. */
async function hover(name: string, pointerType: 'mouse' | 'touch') {
  const menu = byRole('menu', 'Model and effort')
  const row = Array.from(menu.querySelectorAll('[role^="menuitem"]')).find(
    (item) => accessibleName(item) === name,
  )
  if (!row) throw new Error(`No row ${name} in the model menu`)
  await act(async () => {
    row.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerType }),
    )
  })
}

describe('All models in the model menu of a session', () => {
  it('opens with the right arrow and a press with the focus on the current model, moves with the arrows, and closes with the left arrow and Escape, which give the focus back to All models', async () => {
    const view = await mount(
      <Session
        favourites={favourites}
        sent={[]}
        start={{ ...opus, model: 'sonnet' }}
      />,
    )
    await press(triggerOf(view))
    // No favourite is Sonnet 5.5 High, so the first row takes the focus.
    const start = focused()
    await pressKey('ArrowDown')
    await pressKey('ArrowDown')
    await pressKey('ArrowRight')
    const opened = { focus: focused(), rows: rows('All models') }
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
    expect({
      start,
      opened,
      moved,
      left,
      pressed,
      escaped,
      closed: queryByRole('menu', 'Model and effort'),
    }).toEqual({
      start: 'Opus 5.5 High',
      opened: {
        focus: 'Sonnet 5.5',
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
    })
  })

  it('opens beside the menu at a hover of a mouse over All models and closes at a hover over another row, and a touch opens nothing', async () => {
    const view = await mount(
      <Session favourites={favourites} sent={[]} start={opus} />,
    )
    await press(triggerOf(view))
    await hover('All models', 'touch')
    const touched = submenuShows()
    await hover('All models', 'mouse')
    const hovered = { shows: submenuShows(), focus: focused() }
    await hover('Fast', 'mouse')
    expect({ touched, hovered, left: submenuShows() }).toEqual({
      touched: false,
      hovered: { shows: true, focus: 'Opus 5.5 High' },
      left: false,
    })
  })

  it('keeps the New session mark of each model of the other agent, and a pick changes the model with the effort and fast mode that a model keeps', async () => {
    const sent: AgentChoice[] = []
    const view = await mount(
      <Session
        favourites={favourites}
        sent={sent}
        sessionAgent="claude"
        start={{ ...opus, fast: true }}
      />,
    )
    await press(triggerOf(view))
    await press(byRole('menuitem', 'All models'))
    const spoken = spokenChoices('All models')
    await press(choiceSaying('GPT-6.1 Sol New session', 'All models'))
    expect({
      spoken,
      sent,
      open: queryByRole('menu', 'Model and effort'),
    }).toEqual({
      spoken: ['Opus 5.5', 'Sonnet 5.5', 'GPT-6.1 Sol New session'],
      sent: [{ agent: 'codex', model: 'sol', effort: 'high', fast: true }],
      open: null,
    })
  })

  it('shows its list in place of the menu in the phone layout, with Back at its top, which shows the menu again', async () => {
    const sent: AgentChoice[] = []
    const view = await mount(
      <TouchScreen>
        <Session favourites={favourites} sent={sent} start={opus} />
      </TouchScreen>,
    )
    await press(triggerOf(view))
    await press(byRole('menuitem', 'All models'))
    const list = {
      menu: queryByRole('menu', 'Model and effort'),
      rows: rows('All models'),
      focus: focused(),
    }
    await press(byRole('menuitem', 'Back'))
    const back = { shows: submenuShows(), focus: focused() }
    await press(byRole('menuitem', 'All models'))
    await press(byRole('menuitemradio', 'Sonnet 5.5'))
    expect({ list, back, sent }).toEqual({
      list: {
        menu: null,
        rows: [
          { role: 'menuitem', name: 'Back', on: null },
          { role: 'menuitemradio', name: 'Opus 5.5', on: 'true' },
          { role: 'menuitemradio', name: 'Sonnet 5.5', on: 'false' },
          { role: 'menuitemradio', name: 'GPT-6.1 Sol', on: 'false' },
        ],
        focus: 'Opus 5.5',
      },
      back: { shows: false, focus: 'All models' },
      sent: [{ ...opus, model: 'sonnet' }],
    })
  })
})
