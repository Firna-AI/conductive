// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test } from 'vitest'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import type { AccountResponse } from '../../shared/account'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { coreFixtures } from '../../test-support/fixtures/core'
import { focused } from '../layout/rail-test-kit'
import { click, settle } from '../test-mount'
import {
  astraMedium,
  echoSaves,
  favouriteRows,
  favouritesPath,
  mountFavourites,
  opusHigh,
  opusMax,
  pickerAt,
  removeButton,
  solHigh,
  sonnetMedium,
} from './favourites-test-kit'

/** The account of the fake API with `favourites`. */
function accountWith(favourites: readonly AgentChoice[]): AccountResponse {
  return { ...coreFixtures().account, favourites }
}

const five = [opusHigh, opusMax, sonnetMedium, solHigh, astraMedium]

/** The reply of the Worker to a save of five with a copy of Opus 5.5 High. */
const withoutCopy = {
  favourites: [opusHigh, sonnetMedium, solHigh, astraMedium],
}

const removals = [
  {
    name: '× of a middle row gives the focus to × of the row that takes its place',
    favourites: five,
    remove: 'Opus 5.5 Max',
    focus: 'Remove Sonnet 5.5 Medium',
  },
  {
    name: '× of the last row gives the focus to × of the new last row',
    favourites: five,
    remove: 'GPT-6 Astra Medium',
    focus: 'Remove GPT-6.1 Sol High',
  },
  {
    name: '× of the only row gives the focus to Add a favourite',
    favourites: [opusHigh],
    remove: 'Opus 5.5 High',
    focus: 'Add a favourite',
  },
]

describe('the focus of the Favourites section when a render takes away its focused control', () => {
  test.each(removals)('$name', async ({ favourites, remove, focus }) => {
    const server = new FakeApiServer()
    echoSaves(server)
    const { view, held } = await mountFavourites(
      server,
      accountWith(favourites),
    )
    held.holdAnswer('PUT', favouritesPath)
    click(removeButton(view, remove))
    const saving = focused()
    held.release('PUT', favouritesPath)
    await settle()
    expect({ saving, saved: focused() }).toEqual({
      saving: focus,
      saved: focus,
    })
  })

  test('a reply that drops the copy that a pick made gives the focus to the picker of the row that takes its place', async () => {
    const server = new FakeApiServer()
    server.json('PUT', favouritesPath, withoutCopy)
    const { view, held } = await mountFavourites(server)
    held.holdAnswer('PUT', favouritesPath)
    const picker = pickerAt(view, 1)
    click(picker)
    click(byRole('menuitem', 'Effort Max'))
    click(byRole('menuitemradio', 'High'))
    await settle()
    const saving = document.activeElement === picker
    held.release('PUT', favouritesPath)
    await settle()
    expect({ saving, rows: favouriteRows(view), saved: focused() }).toEqual({
      saving: true,
      rows: [
        'Opus 5.5, High',
        'Sonnet 5.5, Medium',
        'GPT-6.1 Sol, High',
        'GPT-6 Astra, Medium',
      ],
      saved: 'Model and effort: Sonnet 5.5, Medium',
    })
  })

  test('a reply that drops a row while the menu of its picker is open gives the focus to the picker of the row that takes its place', async () => {
    const server = new FakeApiServer()
    server.json('PUT', favouritesPath, withoutCopy)
    const { view, held } = await mountFavourites(server)
    held.holdAnswer('PUT', favouritesPath)
    const picker = pickerAt(view, 1)
    click(picker)
    click(byRole('menuitem', 'Effort Max'))
    click(byRole('menuitemradio', 'High'))
    await settle()
    // The person opens the menu of the copy again before the reply.
    click(picker)
    const menu = byRole('menu', 'Model and effort')
    const inMenu = menu.contains(document.activeElement)
    held.release('PUT', favouritesPath)
    await settle()
    expect({
      inMenu,
      open: queryByRole('menu', 'Model and effort'),
      saved: focused(),
    }).toEqual({
      inMenu: true,
      open: null,
      saved: 'Model and effort: Sonnet 5.5, Medium',
    })
  })

  test('a failed save of an add gives the focus from the picker of the new row to the picker of the last row', async () => {
    const server = new FakeApiServer()
    const error = { code: 'save_failed', message: 'Try again.' }
    server.json('PUT', favouritesPath, { error }, 503)
    const four = [opusHigh, opusMax, sonnetMedium, solHigh]
    const { view, held } = await mountFavourites(server, accountWith(four))
    held.holdAnswer('PUT', favouritesPath)
    click(byRole('button', 'Add a favourite', view))
    click(byRole('menuitem', 'Opus 5.5'))
    await settle()
    const saving = focused()
    held.release('PUT', favouritesPath)
    await settle()
    expect({ saving, rows: favouriteRows(view), failed: focused() }).toEqual({
      saving: 'Model and effort: Opus 5.5, Medium',
      rows: [
        'Opus 5.5, High',
        'Opus 5.5, Max',
        'Sonnet 5.5, Medium',
        'GPT-6.1 Sol, High',
      ],
      failed: 'Model and effort: GPT-6.1 Sol, High',
    })
  })

  test('a mount, and a reply that drops a row after a click took the focus out of the list, move no focus', async () => {
    const server = new FakeApiServer()
    server.json('PUT', favouritesPath, withoutCopy)
    const { view, held } = await mountFavourites(server)
    const mounted = focused()
    held.holdAnswer('PUT', favouritesPath)
    const picker = pickerAt(view, 1)
    click(picker)
    click(byRole('menuitem', 'Effort Max'))
    click(byRole('menuitemradio', 'High'))
    await settle()
    const picked = document.activeElement === picker
    // A click on the page outside the list takes the focus from the picker.
    act(() => picker.blur())
    held.release('PUT', favouritesPath)
    await settle()
    expect({
      mounted,
      picked,
      rows: favouriteRows(view).length,
      dropped: focused(),
    }).toEqual({ mounted: null, picked: true, rows: 4, dropped: null })
  })
})
