// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { requestLines } from '../../../app/test-kit'
import { routes } from '../../../app/router'
import { readView } from '../../../chat/api/read-responses'
import { desktopPath } from '../../../shared/desktop'
import { previewsPath } from '../../../shared/previews'
import { terminalPaths } from '../../../shared/terminal'
import {
  workspaceViewPath,
  type WorkspaceViewResponse,
} from '../../../shared/workspace-view'
import { byLabel, byRole, queryByRole } from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../../test-support/fixtures/core'
import { toolFixtures } from '../../../test-support/fixtures/tools'
import { workspaceFixtures } from '../../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  waitFor,
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
import { previewPortHref, toolHref, type ToolKey } from './tool-address'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id, preview } = FAKE_IDS
const previewHref = toolHref(org, id, 'preview', preview)

/** The tool of a saved view, read as the reply of the view route. */
const toolOf = (body: unknown) => readView({ view: body }).tool

/** The tools panel of the right column on desktop. */
const toolsPanel = (view: HTMLElement) => byRole('region', 'Tools', view)

/** The saved view of the fake API, with `tool` as its saved tool. */
function savedView(tool: ToolKey): WorkspaceViewResponse {
  return { view: { ...workspaceFixtures().view.view, tool } }
}

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
    click(linkTo(toolsPanel(view), toolHref(org, id, 'terminal')))
    await settle()

    // The centre keeps its address, and the terminal kept its connection.
    expect(navigation.href()).toBe(here)
    expect(opened).toHaveLength(1)
    expect(opened[0].socket.closed).toBe(false)
    const saved = await bodiesOf(
      server,
      'PUT',
      workspaceViewPath(org, id),
      from,
    )
    expect(saved.map(toolOf)).toEqual(['preview', 'terminal'])
  })

  test('keep the preview frame and its page while the terminal shows', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const { view } = await openTab(server, routes.workspace(org, id))
    const panel = toolsPanel(view)
    const frameOf = () =>
      panel.querySelector('iframe[title="Preview of port 3000"]')

    click(linkTo(panel, toolHref(org, id, 'preview')))
    await settle()
    const frame = frameOf()
    expect(frame).not.toBeNull()
    click(linkTo(panel, toolHref(org, id, 'terminal')))
    await settle()
    expect(frame?.closest('[hidden]')).not.toBeNull()
    click(linkTo(panel, toolHref(org, id, 'preview')))
    await settle()

    // The same frame shows again, so its page did not load again.
    expect(frameOf()).toBe(frame)
    expect(frame?.closest('[hidden]')).toBeNull()
    expect(frame?.isConnected).toBe(true)
  })

  test('keep the tool tabs around a stopped sandbox on desktop, and mount no tool', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ workspaceState: 'stopped' })
    const { events, opened } = socketsOf(server)
    const { view } = await openTab(server, routes.workspace(org, id), {
      events,
    })

    const column = byLabel('Files and tools', view)
    const tools = (['terminal', 'preview', 'desktop'] as const).map((tool) =>
      currents(column, toolHref(org, id, tool)),
    )
    // The app hides Desktop, so the panel has no Desktop tab.
    expect(tools).toEqual([['page'], [null], []])
    expect(queryByRole('region', 'Tools', view)?.textContent).toContain(
      'Sandbox stopped',
    )
    const toolPaths = [
      terminalPaths.connection(org, id),
      previewsPath(org, id),
      desktopPath(org, id),
    ]
    const toolReads = requestLines(server).filter((line) =>
      toolPaths.some((path) => line === `GET ${path}`),
    )
    expect(toolReads).toEqual([])
    expect(opened).toEqual([])
  })

  // A saved Preview shows that the Desktop address saves nothing: a save of
  // Desktop would change it, where a save over a saved Desktop would not.
  test.each([
    {
      entry: 'a saved Desktop tool',
      saved: 'desktop',
      href: routes.workspace(org, id),
      viewport: 'desktop',
    },
    {
      entry: 'a Desktop address over a saved Preview tool',
      saved: 'preview',
      href: toolHref(org, id, 'desktop'),
      viewport: 'desktop',
    },
    {
      entry: 'a Desktop address on a phone',
      saved: 'desktop',
      href: toolHref(org, id, 'desktop'),
      viewport: 'phone',
    },
  ] as const)(
    '$entry shows the terminal, reads no desktop, and keeps the saved tool',
    async ({ saved, href, viewport }) => {
      holdAnimationFrames()
      const server = new FakeApiServer()
      server.json('GET', workspaceViewPath(org, id), savedView(saved))
      const { events, opened } = socketsOf(server)
      const { view } = await openTab(server, href, { viewport, events })

      expect(currents(view, toolHref(org, id, 'terminal'))).toEqual(['page'])
      expect(linksTo(view, toolHref(org, id, 'desktop'))).toEqual([])
      expect(opened.map(({ path }) => path)).toEqual([
        terminalPaths.socket(org, id),
      ])
      const desktopReads = requestLines(server).filter(
        (line) => line === `GET ${desktopPath(org, id)}`,
      )
      expect(desktopReads).toEqual([])
      const writes = await bodiesOf(
        server,
        'PUT',
        workspaceViewPath(org, id),
        0,
      )
      expect(writes).toEqual([])
    },
  )

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

  // The list of the fake API holds the preview of port 3000 only.
  test.each([
    { layout: 'desktop', viewport: 'desktop' },
    { layout: 'a phone', viewport: 'phone' },
  ] as const)(
    'on $layout, a port address opens the preview of its port, and the address of the preview takes its place',
    async ({ viewport }) => {
      holdAnimationFrames()
      const server = new FakeApiServer()
      const opened = {
        ...toolFixtures().preview.preview,
        id: 'preview-8080',
        port: 8080,
      }
      server.json('POST', previewsPath(org, id), { preview: opened }, 201)
      const here = previewPortHref(org, id, 8080)
      const { view, navigation } = await openTab(server, here, { viewport })
      const frame = await waitFor(
        () => view.querySelector('iframe[title^="Preview of port"]'),
        'a preview frame',
      )

      expect(frame.getAttribute('title')).toBe('Preview of port 8080')
      expect(navigation.history).toEqual([
        toolHref(org, id, 'preview', opened.id),
      ])
      const opens = await bodiesOf(server, 'POST', previewsPath(org, id), 0)
      expect(opens).toEqual([{ port: 8080 }])
    },
  )
})
