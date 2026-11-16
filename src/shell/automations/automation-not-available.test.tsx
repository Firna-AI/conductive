// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { ManualDelay, ManualFocus } from '../../app/test-kit'
import {
  automationPath,
  automationPaths,
  automationsPath,
  type AutomationsResponse,
} from '../../shared/automations'
import {
  byRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { automationFixtures } from '../../test-support/fixtures/automations'
import {
  MOUNTED_TEST_TIMEOUT,
  press,
  typeText,
  waitFor,
} from '../../test-support/mount'
import { settle } from '../test-mount'
import { openApp, runRows, wordsOf } from './automation-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org } = FAKE_IDS
const id = 'review-prs'

/** The words of the main area of the page. */
function mainWords(view: HTMLElement): string {
  const main = view.querySelector('main')
  if (!main) throw new Error('The frame has no main area.')
  return wordsOf(main)
}

/** The refusal of each request of an automation that the org no longer has. */
const gone = {
  error: {
    code: 'automation_not_found',
    message: 'The automation is not available.',
  },
}

/** Another tab deletes the automation: each request of its page gets the refusal. */
function deleteElsewhere(server: FakeApiServer): void {
  server.json('GET', automationPath(org, id), gone, 404)
  server.json('PATCH', automationPath(org, id), gone, 404)
  server.json('GET', automationPaths.runs(org, id), gone, 404)
  server.json('GET', automationsPath(org), {
    automations: automationFixtures().list.automations.filter(
      (item) => item.id !== id,
    ),
  } satisfies AutomationsResponse)
}

/** The number of reads of the automation that the server got. */
function automationReads(server: FakeApiServer): number {
  return server.requests.filter(
    (request) =>
      request.method === 'GET' &&
      new URL(request.url).pathname === automationPath(org, id),
  ).length
}

const unavailable = 'This automation is not available'

describe('an automation that the org no longer has', () => {
  test('shows as not available at a return to its page, and on an open page after its runs read gets the refusal', async () => {
    const first = new FakeApiServer()
    const returned = await openApp(first, routes.automation(org, id))
    await waitFor(
      () => queryByRole('textbox', 'Name', returned.view),
      'the automation',
    )
    // The owner opens the Automations list, while another tab deletes the automation.
    act(() => returned.navigation.push(routes.automations(org)))
    await waitFor(
      () => queryByRole('list', 'Automations', returned.view),
      'the Automations list',
    )
    deleteElsewhere(first)
    act(() => returned.navigation.push(routes.automation(org, id)))
    await waitFor(
      () => queryByText(unavailable, returned.view),
      'the page of the deleted automation',
    )
    const words = mainWords(returned.view)
    returned.view.remove()

    // An open page keeps the focus, so only its runs read hears of it.
    const delay = new ManualDelay()
    const openServer = new FakeApiServer()
    const open = await openApp(
      openServer,
      routes.automation(org, id),
      'desktop',
      {
        delay: delay.delay,
      },
    )
    await runRows(open.view)
    deleteElsewhere(openServer)
    await act(() => delay.runAll())
    await waitFor(
      () => queryByText(unavailable, open.view),
      'the open page after its runs read',
    )
    expect({ words, open: mainWords(open.view) }).toEqual({
      words: `Automations Automation ${unavailable} Open Automations`,
      open: `Automations Automation ${unavailable} Open Automations`,
    })
  })

  test('a failed read keeps the automation, and a Save that gets the refusal shows that it is not available', async () => {
    const server = new FakeApiServer()
    const focus = new ManualFocus()
    const { view } = await openApp(
      server,
      routes.automation(org, id),
      'desktop',
      {
        onFocus: focus.onFocus,
      },
    )
    const name = await waitFor(
      () => queryByRole('textbox', 'Name', view),
      'the automation',
    )
    // The read at a return to the page fails, as when the server is down.
    server.json(
      'GET',
      automationPath(org, id),
      { error: { code: 'server_error', message: 'The request failed.' } },
      500,
    )
    const reads = automationReads(server)
    act(() => focus.focus())
    await waitFor(
      () => automationReads(server) > reads,
      'the read at the return',
    )
    await settle()
    const kept = {
      name: queryByRole('textbox', 'Name', view) !== null,
      failure: queryByText("The automation didn't load", view),
    }
    await typeText(name, 'Review every pull request')
    deleteElsewhere(server)
    await press(byRole('button', 'Save', view))
    await waitFor(
      () => queryByText(unavailable, view),
      'the page after the refused Save',
    )
    expect({ kept, name: queryByRole('textbox', 'Name', view) }).toEqual({
      kept: { name: true, failure: null },
      name: null,
    })
  })
})
