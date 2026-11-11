// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { HeldRequests, ManualFocus } from '../../app/test-kit'
import type { ApiErrorBody } from '../../shared/api'
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
  pressKey,
  typeText,
  waitFor,
} from '../../test-support/mount'
import { bodiesOf, isOff, openApp, wordsOf } from './routine-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org } = FAKE_IDS
const id = 'review-prs'
const path = routinePath(org, id)

function saved(): Routine {
  const routine = routineFixtures().routines.find((item) => item.id === id)
  if (!routine) throw new Error(`The fixtures have no routine ${id}.`)
  return routine
}

/** The routine after the app turned it off, because three runs failed. */
function turnedOff(): Routine {
  return {
    ...saved(),
    active: false,
    inactiveReason: 'failed_runs',
    failedRunsInARow: 3,
  }
}

/** The text of a field of the form, by its name. */
function textOf(view: HTMLElement, name: string): string | null {
  const field = byRole('textbox', name, view)
  return field instanceof HTMLInputElement ||
    field instanceof HTMLTextAreaElement
    ? field.value
    : null
}

/** The state of the Active switch. */
function activeOf(view: HTMLElement): string | null {
  return byRole('switch', 'Active', view).getAttribute('aria-checked')
}

/** Whether Save shows that its save runs. */
function saving(view: HTMLElement): boolean {
  return byRole('button', 'Save', view).getAttribute('aria-busy') === 'true'
}

/**
 * The page of the owner. The test can hold the answer of a request, and it
 * says when the owner comes back to the page.
 */
async function ownerPage() {
  const server = new FakeApiServer()
  const held = new HeldRequests(server)
  const focus = new ManualFocus()
  const { view } = await openApp(server, routes.routine(org, id), 'desktop', {
    fetch: held.fetch,
    onFocus: focus.onFocus,
  })
  await waitFor(
    () => queryByRole('textbox', 'Prompt', view),
    'the form of the owner',
  )
  /** The owner comes back, and the read brings the routine turned off. */
  const comeBack = async () => {
    server.json('GET', path, { routine: turnedOff() })
    act(() => focus.focus())
    await waitFor(
      () => queryByText('This routine turned off', view),
      'the newer routine',
    )
  }
  return { server, held, view, comeBack }
}

/** The prompt that the owner types in the tests. */
const edited = 'Review this pull request for bugs only.'

describe('an edit of the routine page', () => {
  test('keeps the edited field when a newer routine arrives, shows the other fields of the newer routine, and saves only the edit', async () => {
    const { server, view, comeBack } = await ownerPage()
    await typeText(byRole('textbox', 'Prompt', view), edited)
    await comeBack()
    const shown = { prompt: textOf(view, 'Prompt'), active: activeOf(view) }
    server.json('PATCH', path, { routine: { ...turnedOff(), prompt: edited } })
    await press(byRole('button', 'Save', view))
    await waitFor(
      () => isOff(byRole('button', 'Save', view)),
      'the saved routine',
    )
    expect({
      shown,
      sent: await bodiesOf(server, 'PATCH', path),
      active: activeOf(view),
    }).toEqual({
      shown: { prompt: edited, active: 'false' },
      sent: [{ prompt: edited }],
      active: 'false',
    })
  })

  test('gives a field that went out for a save the value of the answer, and keeps a field typed while the save waits', async () => {
    const { server, held, view } = await ownerPage()
    // The Worker trims the name that the save sends.
    await typeText(
      byRole('textbox', 'Name', view),
      'Review every pull request ',
    )
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

  test('keeps the edited prompt when a newer routine arrives while its save waits and the save fails, shows the newer Active, and the next save sends only the edit', async () => {
    const { server, held, view, comeBack } = await ownerPage()
    await typeText(byRole('textbox', 'Prompt', view), edited)
    const failure = { code: 'server_error', message: 'The request failed.' }
    server.json('PATCH', path, { error: failure }, 500)
    held.holdAnswer('PATCH', path)
    await press(byRole('button', 'Save', view))
    await comeBack()
    const waiting = textOf(view, 'Prompt')
    held.release('PATCH', path)
    await waitFor(() => !saving(view), 'the failed save')
    const failed = {
      prompt: textOf(view, 'Prompt'),
      active: activeOf(view),
      toast: queryByText('The routine was not saved') !== null,
    }
    server.json('PATCH', path, { routine: { ...turnedOff(), prompt: edited } })
    await press(byRole('button', 'Save', view))
    await waitFor(
      () => isOff(byRole('button', 'Save', view)),
      'the second save',
    )
    expect({
      waiting,
      failed,
      sent: await bodiesOf(server, 'PATCH', path),
    }).toEqual({
      waiting: edited,
      failed: { prompt: edited, active: 'false', toast: true },
      sent: [{ prompt: edited }, { prompt: edited }],
    })
  })

  test('keeps the edited prompt while its save waits and a newer routine arrives, so text typed then builds on the edit and stays after the answer', async () => {
    const { server, held, view, comeBack } = await ownerPage()
    const prompt = () => byRole('textbox', 'Prompt', view)
    await typeText(prompt(), edited)
    server.json('PATCH', path, { routine: { ...turnedOff(), prompt: edited } })
    held.holdAnswer('PATCH', path)
    await press(byRole('button', 'Save', view))
    await comeBack()
    // The owner adds a sentence after the text that the field shows.
    await typeText(prompt(), `${textOf(view, 'Prompt')} Skip drafts.`)
    held.release('PATCH', path)
    await waitFor(() => !saving(view), 'the answer of the save')
    const answered = textOf(view, 'Prompt')
    const longer = `${edited} Skip drafts.`
    server.json('PATCH', path, { routine: { ...turnedOff(), prompt: longer } })
    await press(byRole('button', 'Save', view))
    await waitFor(
      () => isOff(byRole('button', 'Save', view)),
      'the second save',
    )
    expect({ answered, sent: await bodiesOf(server, 'PATCH', path) }).toEqual({
      answered: longer,
      sent: [{ prompt: edited }, { prompt: longer }],
    })
  })

  test('keeps the saved repository in the note of a removed repository while the owner picks another one', async () => {
    const server = new FakeApiServer()
    server.json('GET', path, {
      routine: {
        ...saved(),
        repositoryId: 'admin-dashboard',
        active: false,
        inactiveReason: 'repository_removed',
      },
    })
    const { view } = await openApp(server, routes.routine(org, id))
    const picker = await waitFor(
      () => queryByRole('button', 'Repository: acme/admin-dashboard', view),
      'the form of the owner',
    )
    await press(picker)
    await press(
      await waitFor(
        () => queryByRole('menuitemradio', 'acme/storefront'),
        'the chosen repositories',
      ),
    )
    const note = view.querySelector('main [role="alert"]')
    expect({
      picked:
        queryByRole('button', 'Repository: acme/storefront', view) !== null,
      note: note && wordsOf(note),
    }).toEqual({
      picked: true,
      note: 'This routine turned off acme/admin-dashboard is no longer a chosen repository of Acme. Choose another repository, then turn it on.',
    })
  })

  test('keeps a login that the save refuses in its filter when a newer routine arrives while the save waits', async () => {
    const { server, held, view, comeBack } = await ownerPage()
    const pushed = byRole('button', 'Authors of PR pushed', view)
    await press(pushed)
    await typeText(
      byRole('textbox', 'Add a login to Author is not', view),
      'renovate-bot',
    )
    await pressKey('Enter')
    await press(pushed)
    const refusal: ApiErrorBody = {
      error: {
        code: 'unknown_github_login',
        message: 'GitHub account renovate-bot was not found. Check the login.',
        details: { login: 'renovate-bot', triggerIndex: 1, list: 'isNot' },
      },
    }
    server.json('PATCH', path, refusal, 400)
    held.holdAnswer('PATCH', path)
    await press(byRole('button', 'Save', view))
    await comeBack()
    held.release('PATCH', path)
    await waitFor(
      () =>
        queryByText(
          'No GitHub account is named renovate-bot. Check the spelling, then save.',
          view,
        ),
      'the refusal',
    )
    const chips = queryByRole('group', 'Author is not', view)
    expect({
      chips: chips && wordsOf(chips),
      active: activeOf(view),
    }).toEqual({
      chips: '@renovate-bot , not found on GitHub',
      active: 'false',
    })
  })
})
