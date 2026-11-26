// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import type { Workspace } from '../../shared/generated/Workspace'
import { routes } from '../../app/router'
import { ManualDelay, requestLines } from '../../app/test-kit'
import {
  WORKSPACE_RESTORE_MS,
  workspacePath,
  workspacePaths,
  workspacesPath,
} from '../../shared/workspaces'
import {
  accessibleName,
  byLabel,
  byRole,
  queryByRole,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import {
  openPaletteTab,
  options,
  searchField,
} from '../palette/palette-test-kit'
import { pressCommand } from '../shortcuts/shortcut-test-kit'
import { click, press, settle, typeText } from '../test-mount'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace } = FAKE_IDS
const open = routes.workspace(org, workspace)

/**
 * The fake API of Priya Raman, a member who neither owns the archived open
 * workspace nor is an admin. Restore of the workspace ends at `restoreUntil`,
 * 14 days after its Archive, and the workspace then leaves the list.
 * `fields` change the archived record, such as its state of the cloud
 * computer.
 */
function memberServer(
  restoreUntil: number,
  fields: Partial<Workspace> = {},
): FakeApiServer {
  const server = new FakeApiServer({
    workspaceState: 'archived',
    role: 'member',
  })
  const fixtures = workspaceFixtures('archived')
  const kept = {
    ...fixtures.detail.workspace,
    archivedAt: restoreUntil - WORKSPACE_RESTORE_MS,
    restoreUntil,
    ...fields,
  }
  server.json('GET', workspacesPath(org), {
    workspaces: fixtures.workspaces.workspaces.map((item) =>
      item.id === workspace ? kept : item,
    ),
  })
  server.json('GET', workspacePath(org, workspace), {
    ...fixtures.detail,
    workspace: kept,
  })
  return server
}

/**
 * The title and the text of the bar of the archived workspace, also after
 * it left the list, or null.
 */
function archivedBar(view: HTMLElement): string[] | null {
  const title = Array.from(view.querySelectorAll('main span')).find(
    (span) =>
      span.childElementCount === 0 &&
      /^(Archived|Removed) on/.test(span.textContent ?? ''),
  )
  if (!title) return null
  return [title.textContent ?? '', title.nextElementSibling?.textContent ?? '']
}

/** The names of the options of the palette for a search, which then closes. */
function paletteOptions(search: string): string[] {
  pressCommand('command-palette', 'other', document.body)
  typeText(searchField(), search)
  const names = options().map(accessibleName)
  press(searchField(), 'Escape')
  return names
}

/**
 * The Restore controls that show: the bar, the row, and the palette. The
 * row of the Archived group shows as long as the list holds the workspace.
 */
function restoreControls(view: HTMLElement) {
  const list = byLabel('Workspaces', view)
  const archived = queryByRole('region', 'Archived', list)
  return {
    bar: queryByRole('button', 'Restore', view.querySelector('main') ?? view)
      ? 'Restore'
      : null,
    listed: list.querySelector(`a[href="${open}"]`) !== null,
    row:
      archived !== null &&
      queryByRole('button', 'Restore workspace', archived) !== null,
    palette: paletteOptions('restore').includes('Restore workspace'),
  }
}

describe('Restore of an archived workspace', () => {
  test('a member sees Restore on the bar, the row, and the palette until its last day, and at that time each goes, the row leaves the list, and the bar says Removed, with no other event', async () => {
    holdAnimationFrames()
    let now = FAKE_TIME
    const timers = new ManualDelay()
    const restoreUntil = FAKE_TIME + 60_000
    const { view } = await openPaletteTab(open, {
      server: memberServer(restoreUntil),
      clock: { now: () => now, delay: timers.delay },
    })
    const kept = { bar: archivedBar(view), controls: restoreControls(view) }
    now = restoreUntil
    await act(async () => {
      await timers.runAll()
    })
    await settle()
    expect({
      kept,
      ended: { bar: archivedBar(view), controls: restoreControls(view) },
    }).toEqual({
      kept: {
        bar: [
          'Archived on 1 January',
          'Restore it until 15 January to bring back its files and sessions. It leaves the list on that day.',
        ],
        controls: { bar: 'Restore', listed: true, row: true, palette: true },
      },
      // A failed delete of the cloud computer can still try again, so the
      // bar claims no delete.
      ended: {
        bar: [
          'Removed on 15 January',
          'It left the list. Its cloud computer is being deleted, and the chat is read-only.',
        ],
        controls: { bar: null, listed: false, row: false, palette: false },
      },
    })
  })

  test('keeps Restore unavailable for an unresolved computer and updates its notice at expiry', async () => {
    holdAnimationFrames()
    let now = FAKE_TIME
    const timers = new ManualDelay()
    const end = FAKE_TIME + 60_000
    const { view } = await openPaletteTab(open, {
      server: memberServer(end, {
        restoreUntil: null,
        archivedComputer: { state: 'may-exist', restoreUntil: end },
      }),
      clock: { now: () => now, delay: timers.delay },
    })
    const pending = { bar: archivedBar(view), controls: restoreControls(view) }
    now = end
    await act(async () => {
      await timers.runAll()
    })
    await settle()
    expect({
      pending,
      ended: { bar: archivedBar(view), controls: restoreControls(view) },
    }).toEqual({
      pending: {
        bar: [
          'Archived on 1 January',
          'Your chat history is available. It leaves the list on 15 January.',
        ],
        controls: { bar: null, listed: true, row: false, palette: false },
      },
      ended: {
        bar: [
          'Removed on 15 January',
          'It left the list. Its cloud computer is being deleted, and the chat is read-only.',
        ],
        controls: { bar: null, listed: false, row: false, palette: false },
      },
    })
  })

  test('Restore from the bar brings the workspace back stopped, with its row in its section, and starts nothing', async () => {
    holdAnimationFrames()
    const server = memberServer(FAKE_TIME + WORKSPACE_RESTORE_MS)
    const { view } = await openPaletteTab(open, { server })
    const main = () => view.querySelector('main') ?? view
    click(byRole('button', 'Restore', main()))
    await settle()
    const list = byLabel('Workspaces', view)
    expect({
      restored: {
        bar: archivedBar(view),
        stopped: main().textContent?.includes('Sandbox stopped'),
        resume: queryByRole('button', 'Resume', main()) !== null,
        group: queryByRole('region', 'Archived', list),
        section: list
          .querySelector(`a[href="${open}"]`)
          ?.closest('section')
          ?.getAttribute('aria-label'),
      },
      writes: requestLines(server).filter((line) => line.startsWith('POST')),
    }).toEqual({
      restored: {
        bar: null,
        stopped: true,
        resume: true,
        group: null,
        section: 'Checkout',
      },
      writes: [`POST ${workspacePaths.restore(org, workspace)}`],
    })
  })
})
