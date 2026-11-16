// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../../app/router'
import { readView } from '../../../chat/api/read-responses'
import { previewsPath } from '../../../shared/previews'
import { workspaceViewPath } from '../../../shared/workspace-view'
import { requestLines } from '../../../app/test-kit'
import { byLabel, byRole } from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../../test-support/fixtures/core'
import { toolFixtures } from '../../../test-support/fixtures/tools'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  typeText,
  waitFor,
} from '../../../test-support/mount'
import { nextEnvelope } from '../../../test-support/recorded-repairs'
import { click, settle } from '../../test-mount'
import { bodiesOf } from '../kept-test-kit'
import { currents, linksTo, linkTo, openTab } from '../wiring-test-kit'
import { previewPortHref, toolHref } from '../tools/tool-address'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id, preview: listedId } = FAKE_IDS
const listed = toolFixtures().preview.preview
const tabOf = (port: number) => previewPortHref(org, id, port)
const rowOf = (view: HTMLElement) => byLabel('Sessions and files', view)
const toolsPanel = (view: HTMLElement) => byRole('region', 'Tools', view)
const frameOf = (view: HTMLElement, port: number) =>
  view.querySelector(`iframe[title="Preview of port ${port}"]`)

/** The fake API, which opens a preview of `port` with `previewId`. */
function serverOpening(port: number, previewId: string): FakeApiServer {
  const server = new FakeApiServer()
  server.json(
    'POST',
    previewsPath(org, id),
    { preview: { ...listed, id: previewId, port } },
    201,
  )
  return server
}

describe('the Preview tabs of the desktop', () => {
  test('a click on a port with a tab shows its tab with no request, and a typed port opens a new tab', async () => {
    holdAnimationFrames()
    const server = serverOpening(8080, 'preview-8080')
    const { view, navigation } = await openTab(
      server,
      routes.workspace(org, id),
    )
    navigation.push(toolHref(org, id, 'preview'))
    await settle()
    click(byRole('button', 'Port 3000', toolsPanel(view)))
    const shown = await waitFor(() => frameOf(view, 3000), 'the page of 3000')
    const first = {
      at: navigation.href(),
      tab: currents(rowOf(view), tabOf(3000)),
      row: byRole('button', 'Port 3000', toolsPanel(view)).getAttribute(
        'aria-current',
      ),
    }
    await typeText(byLabel('Other port', toolsPanel(view)), '8080')
    click(byRole('button', 'Open preview', toolsPanel(view)))
    await waitFor(() => frameOf(view, 8080), 'the page of 8080')
    expect({
      first,
      shown: shown.isConnected,
      at: navigation.href(),
      tabs: [
        linksTo(rowOf(view), tabOf(3000)),
        linksTo(rowOf(view), tabOf(8080)),
      ].map((links) => links.length),
      opens: await bodiesOf(server, 'POST', previewsPath(org, id), 0),
    }).toEqual({
      first: { at: tabOf(3000), tab: ['page'], row: 'page' },
      shown: true,
      at: tabOf(8080),
      tabs: [1, 1],
      opens: [{ port: 8080 }],
    })
  })

  test('Close of a Preview tab removes the tab, goes back to the chat, and ends no preview', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const { view, navigation } = await openTab(server, tabOf(3000))
    await waitFor(() => frameOf(view, 3000), 'the page')
    const from = server.requests.length

    click(byRole('button', 'Close Port 3000', rowOf(view)))
    await settle()
    const saved = await bodiesOf(
      server,
      'PUT',
      workspaceViewPath(org, id),
      from,
    )
    expect({
      at: navigation.href(),
      tabs: linksTo(rowOf(view), tabOf(3000)).length,
      page: frameOf(view, 3000),
      previews: readView({ view: saved.at(-1) }).tabs.filter(
        (tab) => tab.kind === 'preview',
      ),
      deletes: requestLines(server).filter((line) => line.startsWith('DELETE')),
    }).toEqual({
      at: routes.workspace(org, id),
      tabs: 0,
      page: null,
      previews: [],
      deletes: [],
    })
  })

  test('the bar of the tab reloads the page and opens it in a new browser tab', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const { view } = await openTab(server, tabOf(3000))
    const before = await waitFor(() => frameOf(view, 3000), 'the page')
    const open = byRole('link', 'Open in new tab', view)

    click(byRole('button', 'Reload', view))
    await settle()
    const after = frameOf(view, 3000)
    expect({
      href: open.getAttribute('href'),
      target: open.getAttribute('target'),
      reloaded: after !== null && after !== before,
    }).toEqual({ href: listed.url, target: '_blank', reloaded: true })
  })

  test('a revoke of the shown preview opens a new one for its tab, with no notice', async () => {
    holdAnimationFrames()
    const server = serverOpening(3000, 'preview-3000-new')
    const { view } = await openTab(server, tabOf(3000))
    await waitFor(() => frameOf(view, 3000), 'the page')

    server.events.emit(
      nextEnvelope(
        server.events,
        { type: 'preview.revoked', previewId: listedId },
        FAKE_TIME,
      ),
    )
    await waitFor(
      () =>
        requestLines(server).includes(`POST ${previewsPath(org, id)}`)
          ? true
          : null,
      'the open of a new preview',
    )
    await settle()
    expect({
      opens: await bodiesOf(server, 'POST', previewsPath(org, id), 0),
      page: frameOf(view, 3000) !== null,
    }).toEqual({ opens: [{ port: 3000 }], page: true })
  })

  test('after a refused open, a click on the port of the shown tab asks again', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    server.json(
      'POST',
      previewsPath(org, id),
      { error: { code: 'invalid_port', message: 'Port 7682 is reserved.' } },
      400,
    )
    const { view, navigation } = await openTab(server, tabOf(7682))
    await waitFor(
      () =>
        view.textContent?.includes('Port 7682 is reserved.') ? true : null,
      'the refusal',
    )
    const once = (await bodiesOf(server, 'POST', previewsPath(org, id), 0))
      .length
    // A second click on the shown tab is a new show.
    click(linkTo(rowOf(view), tabOf(7682)))
    await settle()
    expect({
      once,
      again: (await bodiesOf(server, 'POST', previewsPath(org, id), 0)).length,
      at: navigation.href(),
    }).toEqual({ once: 1, again: 2, at: tabOf(7682) })
  })

  test('a click on the Terminal tab of the tools keeps the Preview tab shown, and the panel shows Terminal', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const { view, navigation } = await openTab(server, tabOf(3000))
    const frame = await waitFor(() => frameOf(view, 3000), 'the page')

    click(linkTo(toolsPanel(view), toolHref(org, id, 'terminal')))
    await settle()
    expect({
      at: navigation.href(),
      hidden: frame.closest('[hidden]') !== null,
      terminal: currents(toolsPanel(view), toolHref(org, id, 'terminal')),
    }).toEqual({ at: tabOf(3000), hidden: false, terminal: ['page'] })
  })

  test('a click on a session tab goes back to the chat, and the Preview tab stays', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const { view, navigation } = await openTab(server, tabOf(3000))
    const frame = await waitFor(() => frameOf(view, 3000), 'the page')

    click(byRole('button', 'Address autocomplete', rowOf(view)))
    await settle()
    expect({
      at: navigation.href(),
      tab: currents(rowOf(view), tabOf(3000)),
      hidden: frame.closest('[hidden]') !== null,
    }).toEqual({
      at: routes.workspace(org, id),
      tab: [null],
      hidden: true,
    })
  })
})
