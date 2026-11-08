// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { requestLines } from '../../../app/test-kit'
import { routes } from '../../../app/router'
import { readView } from '../../../chat/api/read-responses'
import { desktopPath } from '../../../shared/desktop'
import { terminalPaths } from '../../../shared/terminal'
import { workspaceViewPath } from '../../../shared/workspace-view'
import { byRole, queryByRole } from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../../test-support/mount'
import { nextEnvelope } from '../../../test-support/recorded-repairs'
import { click, settle } from '../../test-mount'
import { bodiesOf } from '../kept-test-kit'
import {
  currents,
  linksTo,
  linkTo,
  openTab,
  socketsOf,
} from '../wiring-test-kit'
import { toolHref } from './tool-address'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id, preview } = FAKE_IDS
const previewHref = toolHref(org, id, 'preview', preview)

/** The tool of a saved view, read as the reply of the view route. */
const toolOf = (body: unknown) => readView({ view: body }).tool

/** The tools panel of the right column on desktop. */
const toolsPanel = (view: HTMLElement) => byRole('region', 'Tools', view)

describe('the tools in the workspace', () => {
  test('open the terminal on the socket of the app, keep it while the other tools show, and save each tool', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const { events, opened } = socketsOf(server)
    const here = routes.workspace(org, id)
    const { view, navigation } = await openTab(server, here, { events })
    const from = server.requests.length

    expect(opened.map(({ path, protocol }) => [path, protocol])).toEqual([
      [terminalPaths.socket(org, id), 'tty'],
    ])
    click(linkTo(toolsPanel(view), toolHref(org, id, 'preview')))
    await settle()
    expect(currents(toolsPanel(view), previewHref)).toEqual(['page'])
    click(linkTo(toolsPanel(view), toolHref(org, id, 'desktop')))
    await settle()
    click(linkTo(toolsPanel(view), toolHref(org, id, 'terminal')))
    await settle()

    // The centre keeps its address, and the terminal kept its connection.
    expect(navigation.href()).toBe(here)
    expect(opened).toHaveLength(1)
    expect(opened[0].socket.closed).toBe(false)
    const desktopReads = requestLines(server).filter(
      (line) => line === `GET ${desktopPath(org, id)}`,
    )
    expect(desktopReads).toHaveLength(1)
    const saved = await bodiesOf(
      server,
      'PUT',
      workspaceViewPath(org, id),
      from,
    )
    expect(saved.map(toolOf)).toEqual(['preview', 'desktop', 'terminal'])
  })

  test('keep a preview gone that the workspace revoked before the Preview tool showed', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    server.events.emit(
      nextEnvelope(
        server.events,
        { type: 'preview.revoked', previewId: preview },
        FAKE_TIME,
      ),
    )
    const { view } = await openTab(server, routes.workspace(org, id))

    click(linkTo(toolsPanel(view), toolHref(org, id, 'preview')))
    await settle()

    // The list of the fake API still names the preview.
    expect(linksTo(toolsPanel(view), previewHref)).toEqual([])
    expect(queryByRole('button', 'Open preview', view)).not.toBeNull()
  })

  test('on a phone, a preview address shows that preview and saves the tool', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const { view } = await openTab(server, previewHref, { viewport: 'phone' })

    const frame = view.querySelector('iframe[title="Preview of port 3000"]')
    expect(frame).not.toBeNull()
    expect(currents(view, previewHref)).toEqual(['page'])
    const saved = await bodiesOf(server, 'PUT', workspaceViewPath(org, id), 0)
    expect(saved.map(toolOf)).toEqual(['preview'])
  })
})
