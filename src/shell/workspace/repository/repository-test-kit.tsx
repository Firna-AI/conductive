import { act } from 'react'
import { routes } from '../../../app/router'
import { ManualDelay } from '../../../app/test-kit'
import { pendingJobWait } from '../../../github/barRuns'
import { workspacePaths } from '../../../shared/workspaces'
import { queryByRole } from '../../../test-support/dom-queries'
import type { FakeApiServer } from '../../../test-support/fake-api'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import { waitFor } from '../../../test-support/mount'
import { settle } from '../../test-mount'
import type { Viewport } from '../../ui/viewport'
import { bodiesOf } from '../kept-test-kit'
import { openTab } from '../wiring-test-kit'

// The helpers of the tests of the repository change in the header.

export const { org, workspace: id } = FAKE_IDS
export const startPath = workspacePaths.repository(org, id)

/** Each request body that started a repository change. */
export function changeBodies(server: FakeApiServer): Promise<unknown[]> {
  return bodiesOf(server, 'POST', startPath, 0)
}

/**
 * The whole app at the open workspace, with timers that the test runs, so
 * a pending change reads its job again only when the test says so.
 */
export async function openWorkspace(
  server: FakeApiServer,
  options: { viewport?: Viewport; href?: string } = {},
) {
  const delay = new ManualDelay()
  const tab = await openTab(server, options.href ?? routes.workspace(org, id), {
    viewport: options.viewport,
    delay: delay.delay,
  })
  const header = () => {
    const found = tab.view.querySelector('header')
    if (!found) throw new Error('The workspace has no header')
    return found
  }
  /** The repository button, once the chat read which repositories it holds. */
  const button = (name: string) =>
    waitFor(
      () => queryByRole('button', name, header()),
      `the button "${name}" in the header`,
    )
  /** Reads the pending job once. */
  const poll = async () => {
    await act(() => delay.run(pendingJobWait))
    await settle()
  }
  return { ...tab, header, button, poll }
}

/** The names of the repositories of the open menu, and which one is checked. */
export function menuRows(): { name: string; checked: boolean }[] {
  return Array.from(
    document.querySelectorAll('[role="menuitemradio"]'),
    (row) => ({
      name: row.textContent ?? '',
      checked: row.getAttribute('aria-checked') === 'true',
    }),
  )
}

/** The row of the open menu with this repository. */
export function menuRow(name: string): HTMLElement {
  const row = Array.from(
    document.querySelectorAll<HTMLElement>('[role="menuitemradio"]'),
  ).find((item) => item.textContent === name)
  if (!row) throw new Error(`The menu has no row ${name}`)
  return row
}
