// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { memoryNavigation, NavigationContext } from '../../app/navigation'
import { routes } from '../../app/router'
import { ManualDelay } from '../../app/test-kit'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import { openPaletteTab } from '../palette/palette-test-kit'
import { Shell } from '../Shell'
import { pressHintKey } from '../shortcuts/shortcut-test-kit'
import { click, mountScreen, settle } from '../test-mount'
import { startedApp } from '../test-render'
import { recordingSocket } from './kept-test-kit'
import { socketsOf } from './wiring-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS

/** The header of the open workspace. */
function headerOf(view: HTMLElement): HTMLElement {
  const header = view.querySelector<HTMLElement>('main header')
  if (!header) throw new Error('The workspace shows no header.')
  return header
}

describe('Copy link in the workspace header', () => {
  test('copies the link from the number, says so for a moment, and asks to try again after a failed copy', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const timers = new ManualDelay()
    const copies: string[] = []
    let fails = false
    const app = await startedApp(server, {
      events: recordingSocket(server).source,
      delay: timers.delay,
      copy: async (text) => {
        copies.push(await text)
        if (fails) throw new Error('The clipboard refused the text.')
      },
    })
    const view = mountScreen(
      app,
      <NavigationContext.Provider
        value={memoryNavigation(routes.workspace(org, id))}
      >
        <Shell />
      </NavigationContext.Provider>,
    )
    await settle()
    const { workspace } = workspaceFixtures().detail
    const label = `W-${workspace.number}`
    const header = headerOf(view)
    const button = byRole('button', `Copy link to ${label}`, header)
    expect(button.textContent).toBe(label)

    click(button)
    await settle()
    expect({
      copies,
      note: queryByRole('status', 'Link copied', header) !== null,
      label: button.textContent,
    }).toEqual({ copies: [workspace.link], note: true, label })

    await timers.runAll()
    await settle()
    expect(queryByRole('status', 'Link copied', header)).toBeNull()

    fails = true
    click(byRole('button', `Copy link to ${label}`, header))
    await settle()
    await timers.runAll()
    await settle()
    expect({
      copies: copies.length,
      note:
        queryByRole('status', "The link didn't copy. Try again.", header) !==
        null,
      label: byRole('button', `Copy link to ${label}`, header).textContent,
    }).toEqual({ copies: 2, note: true, label })
  })

  test('the key of Copy link copies the link with the note, as a press does, while the header shows the label', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const copies: string[] = []
    const { app, view, navigation } = await openPaletteTab(
      routes.workspace(org, id),
      {
        server,
        events: socketsOf(server).events,
        copy: async (text) => {
          copies.push(await text)
        },
      },
    )

    const shown = pressHintKey(app, 'copy-link', document.body)
    await settle()
    const note = queryByRole('status', 'Link copied', headerOf(view)) !== null
    // The list of the org shows no workspace header.
    act(() => navigation.push(routes.org(org)))
    await settle()
    const away = pressHintKey(app, 'copy-link', document.body)
    await settle()

    expect({
      prevented: [shown.defaultPrevented, away.defaultPrevented],
      copies,
      note,
    }).toEqual({
      prevented: [true, false],
      copies: [workspaceFixtures().detail.workspace.link],
      note: true,
    })
  })
})
