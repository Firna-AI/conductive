// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { ManualDelay, ManualFocus } from '../../app/test-kit'
import {
  routinePath,
  routinePaths,
  routinesPath,
  type RoutinesResponse,
} from '../../shared/routines'
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
import { settle } from '../test-mount'
import { openApp, runRows, wordsOf } from './routine-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org } = FAKE_IDS
const id = 'review-prs'

/** The words of the main area of the page. */
function mainWords(view: HTMLElement): string {
  const main = view.querySelector('main')
  if (!main) throw new Error('The frame has no main area.')
  return wordsOf(main)
}

/** The refusal of each request of a routine that the org no longer has. */
const gone = {
  error: {
    code: 'routine_not_found',
    message: 'The routine is not available.',
  },
}

/** Another tab deletes the routine: each request of its page gets the refusal. */
function deleteElsewhere(server: FakeApiServer): void {
  server.json('GET', routinePath(org, id), gone, 404)
  server.json('PATCH', routinePath(org, id), gone, 404)
  server.json('GET', routinePaths.runs(org, id), gone, 404)
  server.json('GET', routinesPath(org), {
    routines: routineFixtures().list.routines.filter((item) => item.id !== id),
  } satisfies RoutinesResponse)
}

/** The number of reads of the routine that the server got. */
function routineReads(server: FakeApiServer): number {
  return server.requests.filter(
    (request) =>
      request.method === 'GET' &&
      new URL(request.url).pathname === routinePath(org, id),
  ).length
}

const unavailable = 'This routine is not available'

describe('a routine that the org no longer has', () => {
  test('shows as not available at a return to its page, and on an open page after its runs read gets the refusal', async () => {
    const first = new FakeApiServer()
    const returned = await openApp(first, routes.routine(org, id))
    await waitFor(
      () => queryByRole('textbox', 'Name', returned.view),
      'the routine',
    )
    // The owner opens the Routines list, while another tab deletes the routine.
    act(() => returned.navigation.push(routes.routines(org)))
    await waitFor(
      () => queryByRole('list', 'Routines', returned.view),
      'the Routines list',
    )
    deleteElsewhere(first)
    act(() => returned.navigation.push(routes.routine(org, id)))
    await waitFor(
      () => queryByText(unavailable, returned.view),
      'the page of the deleted routine',
    )
    const words = mainWords(returned.view)
    returned.view.remove()

    // An open page keeps the focus, so only its runs read hears of it.
    const delay = new ManualDelay()
    const openServer = new FakeApiServer()
    const open = await openApp(openServer, routes.routine(org, id), 'desktop', {
      delay: delay.delay,
    })
    await runRows(open.view)
    deleteElsewhere(openServer)
    await act(() => delay.runAll())
    await waitFor(
      () => queryByText(unavailable, open.view),
      'the open page after its runs read',
    )
    expect({ words, open: mainWords(open.view) }).toEqual({
      words: `Routines Routine ${unavailable} Open Routines`,
      open: `Routines Routine ${unavailable} Open Routines`,
    })
  })

  test('a failed read keeps the routine, and a Save that gets the refusal shows that it is not available', async () => {
    const server = new FakeApiServer()
    const focus = new ManualFocus()
    const { view } = await openApp(server, routes.routine(org, id), 'desktop', {
      onFocus: focus.onFocus,
    })
    const name = await waitFor(
      () => queryByRole('textbox', 'Name', view),
      'the routine',
    )
    // The read at a return to the page fails, as when the server is down.
    server.json(
      'GET',
      routinePath(org, id),
      { error: { code: 'server_error', message: 'The request failed.' } },
      500,
    )
    const reads = routineReads(server)
    act(() => focus.focus())
    await waitFor(() => routineReads(server) > reads, 'the read at the return')
    await settle()
    const kept = {
      name: queryByRole('textbox', 'Name', view) !== null,
      failure: queryByText("The routine didn't load", view),
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
