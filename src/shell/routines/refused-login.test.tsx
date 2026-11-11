// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import type { ApiErrorBody } from '../../shared/api'
import { routinePath } from '../../shared/routines'
import {
  byRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import {
  MOUNTED_TEST_TIMEOUT,
  press,
  pressKey,
  typeText,
  waitFor,
} from '../../test-support/mount'
import { openApp, wordsOf } from './routine-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org } = FAKE_IDS

const refusal: ApiErrorBody = {
  error: {
    code: 'unknown_github_login',
    message: 'GitHub account renovate-bot was not found. Check the login.',
    details: { login: 'renovate-bot', triggerIndex: 1, list: 'isNot' },
  },
}

const line =
  'No GitHub account is named renovate-bot. Check the spelling, then save.'

describe('a login that a save refused', () => {
  test('marks its chip in the filter of its trigger, which opens, until the owner changes the triggers', async () => {
    const server = new FakeApiServer()
    const { view } = await openApp(server, routes.routine(org, 'review-prs'))
    const pushed = await waitFor(
      () => queryByRole('button', 'Authors of PR pushed', view),
      'the triggers of the owner',
    )
    await press(pushed)
    await typeText(
      byRole('textbox', 'Add a login to Author is not', view),
      'renovate-bot',
    )
    await pressKey('Enter')
    await press(pushed)
    server.json('PATCH', routinePath(org, 'review-prs'), refusal, 400)
    await press(byRole('button', 'Save', view))
    const alert = await waitFor(() => queryByText(line, view), 'the refusal')
    const filters = () => ({
      opened: byRole('button', 'Authors of PR opened', view).getAttribute(
        'aria-expanded',
      ),
      pushed: pushed.getAttribute('aria-expanded'),
    })
    const marked = {
      ...filters(),
      chips: wordsOf(byRole('group', 'Author is not', view)),
      alert: alert.getAttribute('role'),
    }
    await press(byRole('button', 'Remove @renovate-bot', view))
    expect({
      marked,
      changed: {
        ...filters(),
        line: queryByText(line, view),
        hint: queryByText('These authors never start runs.', view) !== null,
      },
    }).toEqual({
      marked: {
        opened: 'false',
        pushed: 'true',
        chips: '@renovate-bot , not found on GitHub',
        alert: 'alert',
      },
      changed: { opened: 'false', pushed: 'true', line: null, hint: true },
    })
  })

  test('opens the sheet of its trigger on a phone, with the focus on its chip and no suggestions over the line', async () => {
    const server = new FakeApiServer()
    const { view } = await openApp(
      server,
      routes.routine(org, 'review-prs'),
      'phone',
    )
    await press(
      await waitFor(
        () => queryByRole('button', 'Authors of PR pushed', view),
        'the triggers of the owner',
      ),
    )
    await typeText(
      byRole('textbox', 'Add a login to Author is not', document.body),
      'renovate-bot',
    )
    await pressKey('Enter')
    await press(byRole('button', 'Done', document.body))
    server.json('PATCH', routinePath(org, 'review-prs'), refusal, 400)
    await press(byRole('button', 'Save', view))
    await waitFor(() => queryByText(line, document.body), 'the refusal')
    expect({
      sheet: queryByRole('dialog', 'Authors for PR pushed', document.body)
        ?.textContent,
      focus: document.activeElement?.getAttribute('aria-label'),
      suggestions: document.body.querySelectorAll('[role="menu"]').length,
    }).toEqual({
      sheet: expect.stringContaining(line),
      focus: 'Remove @renovate-bot',
      suggestions: 0,
    })
  })
})
