// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test } from 'vitest'
import { byRole, shownToasts } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { mouse } from '../layout/rail-test-kit'
import { click, press, settle } from '../test-mount'
import {
  astraMedium,
  echoSaves,
  favouriteRows,
  favouritesList,
  favouritesPath,
  mountFavourites,
  moveStatus,
  notSaved,
  opusHigh,
  opusMax,
  pickerAt,
  removeButton,
  rowElements,
  saveError,
  sentSaves,
  solHigh,
  sonnetMedium,
} from './favourites-test-kit'

describe('the moves and the saves of the Favourites section', () => {
  test('a drag of a row by the mouse moves it, saves the list in the new order at once, and says the place during the drag and after the drop', async () => {
    const server = new FakeApiServer()
    echoSaves(server)
    const { view } = await mountFavourites(server)
    const rows = rowElements(view)
    rows.forEach((row, index) => {
      const box = new DOMRect(0, index * 40, 600, 40)
      Object.defineProperty(row, 'getBoundingClientRect', {
        configurable: true,
        value: () => box,
      })
    })
    mouse(rows[2], 'pointerdown', { clientY: 100 })
    mouse(window, 'pointermove', { clientY: 90 })
    mouse(window, 'pointermove', { clientY: 5 })
    const during = moveStatus(view)
    mouse(window, 'pointerup', { clientY: 5, buttons: 0 })
    await settle()
    expect({
      during,
      rows: favouriteRows(view),
      status: moveStatus(view),
      sent: await sentSaves(server),
    }).toEqual({
      during: 'Moving Sonnet 5.5 Medium to place 1 of 5',
      rows: [
        'Sonnet 5.5, Medium',
        'Opus 5.5, High',
        'Opus 5.5, Max',
        'GPT-6.1 Sol, High',
        'GPT-6 Astra, Medium',
      ],
      status: 'Sonnet 5.5 Medium moves to place 1 of 5',
      sent: [
        { favourites: [sonnetMedium, opusHigh, opusMax, solHigh, astraMedium] },
      ],
    })
  })

  test('Alt and Up move a focused row one place, keep the focus in the row, and save, and the next press moves it again', async () => {
    const server = new FakeApiServer()
    echoSaves(server)
    const { view } = await mountFavourites(server)
    const remove = removeButton(view, 'GPT-6.1 Sol High')
    act(() => remove.focus())
    const key = press(remove, 'ArrowUp', { alt: true })
    await settle()
    const once = {
      rows: favouriteRows(view),
      status: moveStatus(view),
      focused: document.activeElement === remove,
    }
    press(remove, 'ArrowUp', { alt: true })
    await settle()
    expect({
      stopped: key.defaultPrevented,
      once,
      twice: favouriteRows(view),
      focused: document.activeElement === remove,
      sent: await sentSaves(server),
    }).toEqual({
      stopped: true,
      once: {
        rows: [
          'Opus 5.5, High',
          'Opus 5.5, Max',
          'GPT-6.1 Sol, High',
          'Sonnet 5.5, Medium',
          'GPT-6 Astra, Medium',
        ],
        status: 'GPT-6.1 Sol High moves to place 3 of 5',
        focused: true,
      },
      twice: [
        'Opus 5.5, High',
        'GPT-6.1 Sol, High',
        'Opus 5.5, Max',
        'Sonnet 5.5, Medium',
        'GPT-6 Astra, Medium',
      ],
      focused: true,
      sent: [
        { favourites: [opusHigh, opusMax, solHigh, sonnetMedium, astraMedium] },
        { favourites: [opusHigh, solHigh, opusMax, sonnetMedium, astraMedium] },
      ],
    })
  })

  test('a failed save keeps the saved list with its error under the list and no toast, and the next change clears the error and saves again', async () => {
    const server = new FakeApiServer()
    const error = { code: 'save_failed', message: 'Try again.' }
    server.json('PUT', favouritesPath, { error }, 503)
    const { view } = await mountFavourites(server)
    const remove = removeButton(view, 'Opus 5.5 High')
    act(() => remove.focus())
    press(remove, 'ArrowDown', { alt: true })
    await settle()
    const failed = {
      rows: favouriteRows(view),
      error: saveError(view),
      toasts: shownToasts().length,
      status: moveStatus(view),
    }
    echoSaves(server)
    press(remove, 'ArrowDown', { alt: true })
    await settle()
    const moved = [opusMax, opusHigh, sonnetMedium, solHigh, astraMedium]
    expect({
      failed,
      rows: favouriteRows(view),
      error: saveError(view),
      sent: await sentSaves(server),
    }).toEqual({
      failed: {
        rows: [
          'Opus 5.5, High',
          'Opus 5.5, Max',
          'Sonnet 5.5, Medium',
          'GPT-6.1 Sol, High',
          'GPT-6 Astra, Medium',
        ],
        error: notSaved,
        toasts: 0,
        status: '',
      },
      rows: [
        'Opus 5.5, Max',
        'Opus 5.5, High',
        'Sonnet 5.5, Medium',
        'GPT-6.1 Sol, High',
        'GPT-6 Astra, Medium',
      ],
      error: null,
      sent: [{ favourites: moved }, { favourites: moved }],
    })
  })

  test('while a save runs, the section shows the list that it sent, keeps the focus on the picker of the row, and sends no other save, and after the reply it shows the saved list', async () => {
    const server = new FakeApiServer()
    // The Worker keeps the first of two equal favourites.
    server.json('PUT', favouritesPath, {
      favourites: [opusHigh, sonnetMedium, solHigh, astraMedium],
    })
    const { view, held } = await mountFavourites(server)
    held.holdAnswer('PUT', favouritesPath)
    const picker = pickerAt(view, 1)
    click(picker)
    click(byRole('menuitem', 'Effort Max'))
    click(byRole('menuitemradio', 'High'))
    await settle()
    const sending = {
      rows: favouriteRows(view),
      busy: favouritesList(view).getAttribute('aria-busy'),
      focused: document.activeElement === picker,
    }
    click(removeButton(view, 'GPT-6.1 Sol High'))
    press(removeButton(view, 'GPT-6 Astra Medium'), 'ArrowUp', { alt: true })
    await settle()
    const refused = {
      rows: favouriteRows(view),
      saves: (await sentSaves(server)).length,
    }
    held.release('PUT', favouritesPath)
    await settle()
    const saved = {
      rows: favouriteRows(view),
      busy: favouritesList(view).getAttribute('aria-busy'),
    }
    echoSaves(server)
    click(removeButton(view, 'GPT-6.1 Sol High'))
    await settle()
    expect({
      sending,
      refused,
      saved,
      after: favouriteRows(view),
      sent: await sentSaves(server),
    }).toEqual({
      sending: {
        rows: [
          'Opus 5.5, High',
          'Opus 5.5, High',
          'Sonnet 5.5, Medium',
          'GPT-6.1 Sol, High',
          'GPT-6 Astra, Medium',
        ],
        busy: 'true',
        focused: true,
      },
      refused: {
        rows: [
          'Opus 5.5, High',
          'Opus 5.5, High',
          'Sonnet 5.5, Medium',
          'GPT-6.1 Sol, High',
          'GPT-6 Astra, Medium',
        ],
        saves: 1,
      },
      saved: {
        rows: [
          'Opus 5.5, High',
          'Sonnet 5.5, Medium',
          'GPT-6.1 Sol, High',
          'GPT-6 Astra, Medium',
        ],
        busy: null,
      },
      after: ['Opus 5.5, High', 'Sonnet 5.5, Medium', 'GPT-6 Astra, Medium'],
      sent: [
        {
          favourites: [opusHigh, opusHigh, sonnetMedium, solHigh, astraMedium],
        },
        { favourites: [opusHigh, sonnetMedium, astraMedium] },
      ],
    })
  })
})
