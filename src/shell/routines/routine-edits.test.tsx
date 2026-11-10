// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { HeldRequests, ManualFocus } from '../../app/test-kit'
import { routinePath, type Routine } from '../../shared/routines'
import {
  byRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { routineFixtures } from '../../test-support/fixtures/routines'
import {
  MOUNTED_TEST_TIMEOUT,
  press,
  typeText,
  waitFor,
} from '../../test-support/mount'
import { bodiesOf, isOff, openApp } from './routine-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org } = FAKE_IDS
const id = 'review-prs'
const path = routinePath(org, id)

function saved(): Routine {
  const routine = routineFixtures().routines.find((item) => item.id === id)
  if (!routine) throw new Error(`The fixtures have no routine ${id}.`)
  return routine
}

/** The text of a field of the form, by its name. */
function textOf(view: HTMLElement, name: string): string | null {
  const field = byRole('textbox', name, view)
  return field instanceof HTMLInputElement ||
    field instanceof HTMLTextAreaElement
    ? field.value
    : null
}

/** The prompt that the owner types in the tests. */
const edited = 'Review this pull request for bugs only.'

describe('an edit of the routine page', () => {
  test('keeps the edited field when a newer routine arrives, shows the other fields of the newer routine, and saves only the edit', async () => {
    const server = new FakeApiServer()
    const focus = new ManualFocus()
    const { view } = await openApp(server, routes.routine(org, id), 'desktop', {
      onFocus: focus.onFocus,
    })
    const prompt = await waitFor(
      () => queryByRole('textbox', 'Prompt', view),
      'the form of the owner',
    )
    await typeText(prompt, edited)
    // The app turns the routine off after failed runs, and the owner comes
    // back to the page.
    const turnedOff: Routine = {
      ...saved(),
      active: false,
      inactiveReason: 'failed_runs',
      failedRunsInARow: 3,
    }
    server.json('GET', path, { routine: turnedOff })
    act(() => focus.focus())
    await waitFor(
      () => queryByText('This routine turned off', view),
      'the newer routine',
    )
    const shown = {
      prompt: textOf(view, 'Prompt'),
      active: byRole('switch', 'Active', view).getAttribute('aria-checked'),
    }
    server.json('PATCH', path, { routine: { ...turnedOff, prompt: edited } })
    await press(byRole('button', 'Save', view))
    await waitFor(
      () => isOff(byRole('button', 'Save', view)),
      'the saved routine',
    )
    expect({
      shown,
      sent: await bodiesOf(server, 'PATCH', path),
      active: byRole('switch', 'Active', view).getAttribute('aria-checked'),
    }).toEqual({
      shown: { prompt: edited, active: 'false' },
      sent: [{ prompt: edited }],
      active: 'false',
    })
  })

  test('gives a field that went out for a save the value of the answer, and keeps a field typed while the save waits', async () => {
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    const { view } = await openApp(server, routes.routine(org, id), 'desktop', {
      fetch: held.fetch,
    })
    const name = await waitFor(
      () => queryByRole('textbox', 'Name', view),
      'the form of the owner',
    )
    // The Worker trims the name that the save sends.
    await typeText(name, 'Review every pull request ')
    const trimmed = { ...saved(), name: 'Review every pull request' }
    server.json('PATCH', path, { routine: trimmed })
    held.holdAnswer('PATCH', path)
    await press(byRole('button', 'Save', view))
    await typeText(byRole('textbox', 'Prompt', view), edited)
    held.release('PATCH', path)
    await waitFor(
      () => textOf(view, 'Name') === 'Review every pull request',
      'the answer of the save',
    )
    const answered = {
      prompt: textOf(view, 'Prompt'),
      save: isOff(byRole('button', 'Save', view)),
    }
    server.json('PATCH', path, { routine: { ...trimmed, prompt: edited } })
    await press(byRole('button', 'Save', view))
    await waitFor(
      () => isOff(byRole('button', 'Save', view)),
      'the second save',
    )
    expect({ answered, sent: await bodiesOf(server, 'PATCH', path) }).toEqual({
      answered: { prompt: edited, save: false },
      sent: [{ name: 'Review every pull request ' }, { prompt: edited }],
    })
  })
})
