// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { repositoryBranchesPath } from '../../shared/branches'
import {
  accessibleName,
  byRole,
  isOperable,
  queryByRole,
} from '../../test-support/dom-queries'
import type { FakeApiServer } from '../../test-support/fake-api'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { click, press, settle } from '../test-mount'
import { focusableSelector } from '../ui/Overlay'
import { org } from '../workspace/kept-test-kit'
import { mainOf, openTab, serverWith } from './dialog-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const branchesPath = repositoryBranchesPath(org, 'storefront')

/** New workspace as a page, where each read of the branches fails. */
async function pageWithFailedReads() {
  const server = serverWith('page')
  server.json(
    'GET',
    branchesPath,
    { error: { code: 'github_unavailable', message: 'GitHub is down.' } },
    502,
  )
  const tab = await openTab(server, { at: routes.newWorkspace(org) })
  return { server, main: mainOf(tab.view) }
}

/** The number of reads of the branch list that the server got. */
const reads = (server: FakeApiServer) =>
  server.requests.filter(
    (request) => new URL(request.url).pathname === branchesPath,
  ).length

/** Whether the branch picker shows, by its search field. */
const pickerShows = (root: HTMLElement) =>
  queryByRole('combobox', 'Search branches', root) !== null

/** The element with the focus. It fails when no element has it. */
function focused(): HTMLElement {
  const element = document.activeElement
  if (!(element instanceof HTMLElement) || element === document.body) {
    throw new Error('No element has the focus.')
  }
  return element
}

/** The accessible name of the element with the focus, or `nothing`. */
function focusName(): string {
  const element = document.activeElement
  if (element === null || element === document.body) return 'nothing'
  return accessibleName(element)
}

/**
 * Presses Tab on the element with the focus, as the keyboard does. When no
 * handler stops the key, the focus moves on to the next element that Tab
 * reaches in the order of the page, as a browser moves it. happy-dom does
 * not move it. A handler that takes the element out of the page leaves the
 * focus where the handler put it.
 */
function pressTab(): void {
  const from = focused()
  if (press(from, 'Tab').defaultPrevented) return
  const order = Array.from(
    document.querySelectorAll<HTMLElement>(focusableSelector),
  ).filter((element) => element.tabIndex >= 0 && isOperable(element))
  const at = order.indexOf(from)
  const next = at < 0 ? undefined : order[at + 1]
  act(() => next?.focus())
}

describe('the branch picker on a computer', () => {
  test('lets Tab reach Try again after a failed read, which reads the list again, and closes as Tab leaves its last control', async () => {
    const { server, main } = await pageWithFailedReads()
    click(byRole('button', 'Branch: main', main))
    await settle()
    const opened = { focus: focusName(), reads: reads(server) }
    pressTab()
    const tabbed = { focus: focusName(), picker: pickerShows(main) }
    // Enter on a focused button clicks it, as a browser does.
    click(focused())
    await settle()
    const retried = { focus: focusName(), reads: reads(server) }
    pressTab()
    const again = focusName()
    pressTab()
    expect({
      opened,
      tabbed,
      retried,
      again,
      left: { focus: focusName(), picker: pickerShows(main) },
    }).toEqual({
      opened: { focus: 'Search branches', reads: 1 },
      tabbed: { focus: 'Try again', picker: true },
      retried: { focus: 'Search branches', reads: 2 },
      again: 'Try again',
      left: { focus: 'Message', picker: false },
    })
  })

  test('stays open as a press on its control focuses the control, so the click of that press closes it', async () => {
    const { server, main } = await pageWithFailedReads()
    const control = byRole('button', 'Branch: main', main)
    click(control)
    await settle()
    // A press of the pointer focuses the button as it goes down, and the
    // click comes as it goes up.
    act(() => control.focus())
    const down = {
      picker: pickerShows(main),
      expanded: control.getAttribute('aria-expanded'),
    }
    click(control)
    await settle()
    expect({
      down,
      up: {
        picker: pickerShows(main),
        expanded: control.getAttribute('aria-expanded'),
        reads: reads(server),
      },
    }).toEqual({
      down: { picker: true, expanded: 'true' },
      up: { picker: false, expanded: 'false', reads: 1 },
    })
  })
})
