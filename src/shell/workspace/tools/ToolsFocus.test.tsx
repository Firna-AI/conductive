// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../../app/router'
import { terminalPaths } from '../../../shared/terminal'
import {
  workspaceViewPath,
  type WorkspaceViewResponse,
} from '../../../shared/workspace-view'
import { byRole } from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import { toolFixtures } from '../../../test-support/fixtures/tools'
import { workspaceFixtures } from '../../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../../test-support/mount'
import { click, settle } from '../../test-mount'
import { linkTo, openTab, socketsOf } from '../wiring-test-kit'
import { toolHref } from './tool-address'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS

/** The tools panel of the right column on desktop. */
const toolsPanel = (view: HTMLElement) => byRole('region', 'Tools', view)

/** True when the keyboard focus is in the xterm.js screen of `panel`. */
function terminalFocused(panel: HTMLElement): boolean {
  const active = document.activeElement
  return active !== null && panel.contains(active) && !!active.closest('.xterm')
}

/**
 * A server whose saved view shows Preview, so the terminal mounts at the
 * first click on its tab. Its read of the terminal state waits for
 * `release`.
 */
function heldTerminalServer() {
  const server = new FakeApiServer()
  const saved: WorkspaceViewResponse = {
    view: { ...workspaceFixtures().view.view, tool: 'preview' },
  }
  server.json('GET', workspaceViewPath(org, id), saved)
  let release = () => {}
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  server.handle('GET', terminalPaths.connection(org, id), async () => {
    await held
    return Response.json(toolFixtures().terminal)
  })
  return { server, release }
}

describe('the focus after a click on the Terminal tab', () => {
  test('moves to the connected terminal', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const { events } = socketsOf(server)
    const { view } = await openTab(server, routes.workspace(org, id), {
      events,
    })
    const panel = toolsPanel(view)

    click(linkTo(panel, toolHref(org, id, 'preview')))
    await settle()
    expect(terminalFocused(panel)).toBe(false)
    click(linkTo(panel, toolHref(org, id, 'terminal')))
    await settle()

    expect(terminalFocused(panel)).toBe(true)
  })

  test('moves to the terminal when it connects after the click', async () => {
    holdAnimationFrames()
    const { server, release } = heldTerminalServer()
    const { events, opened } = socketsOf(server)
    const { view } = await openTab(server, routes.workspace(org, id), {
      events,
    })
    const panel = toolsPanel(view)

    click(linkTo(panel, toolHref(org, id, 'terminal')))
    await settle()
    expect(opened).toEqual([])
    release()
    await settle()

    expect(opened).toHaveLength(1)
    expect(terminalFocused(panel)).toBe(true)
  })

  test('stays where the user moved it before the terminal connected', async () => {
    holdAnimationFrames()
    const { server, release } = heldTerminalServer()
    const { events, opened } = socketsOf(server)
    const { view } = await openTab(server, routes.workspace(org, id), {
      events,
    })
    const panel = toolsPanel(view)
    const previewTab = linkTo(panel, toolHref(org, id, 'preview'))

    click(linkTo(panel, toolHref(org, id, 'terminal')))
    await settle()
    act(() => previewTab.focus())
    release()
    await settle()

    expect(opened).toHaveLength(1)
    expect(document.activeElement).toBe(previewTab)
  })
})
