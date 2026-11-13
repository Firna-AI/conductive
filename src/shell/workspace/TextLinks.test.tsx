// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { memoryNavigation, NavigationContext } from '../../app/navigation'
import { routes } from '../../app/router'
import type { UserMessage } from '../../shared/messages'
import { previewsPath } from '../../shared/previews'
import {
  byRole,
  queryByLabel,
  queryByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import {
  FAKE_IDS,
  FAKE_ORIGIN,
  FAKE_TIME,
  fakeUser,
} from '../../test-support/fixtures/core'
import { toolFixtures } from '../../test-support/fixtures/tools'
import { senderSnapshot } from '../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  waitFor,
} from '../../test-support/mount'
import { Shell } from '../Shell'
import { click, mountScreen, settle } from '../test-mount'
import { startedApp } from '../test-render'
import type { Viewport } from '../ui/viewport'
import { bodiesOf, emit, here, org, recordingSocket } from './kept-test-kit'
import { previewPortHref, toolHref } from './tools/tool-address'
import { linksTo, linkTo } from './wiring-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { workspace: id } = FAKE_IDS
const agents = routes.accountTab('agents')
const local = 'http://localhost:8080/checkout'
const portHref = previewPortHref(org, id, 8080)

const message: UserMessage = {
  id: 'links',
  sessionId: FAKE_IDS.session,
  sender: senderSnapshot(fakeUser),
  text: `Try ${local}, then connect Codex at ${FAKE_ORIGIN}${agents}.`,
  attachments: [],
  choice: { agent: 'claude', model: 'Opus 5.5', effort: 'high' },
  createdAt: FAKE_TIME,
  state: 'sent',
}

/** The preview that the fake API opens for port 8080. */
const opened = {
  ...toolFixtures().preview.preview,
  id: 'preview-8080',
  port: 8080,
}

/** The workspace screen with a sent message that holds a local address. */
async function openChat(viewport: Viewport, server: FakeApiServer) {
  holdAnimationFrames()
  server.json('POST', previewsPath(org, id), { preview: opened }, 201)
  const app = await startedApp(server, {
    events: recordingSocket(server).source,
  })
  const navigation = memoryNavigation(here)
  const view = mountScreen(
    app,
    <NavigationContext.Provider value={navigation}>
      <Shell />
    </NavigationContext.Provider>,
    { viewport },
  )
  await settle()
  emit(server, { type: 'message.accepted', message })
  await settle()
  return { view, navigation }
}

describe('links of chat text in the workspace screen', () => {
  test('on desktop, a local address shows the right column again with the preview of its port, and a link of the app opens its page in the same window', async () => {
    const server = new FakeApiServer()
    const { view, navigation } = await openChat('desktop', server)
    click(byRole('button', 'Hide the right column', view))
    await settle()
    const hidden = queryByLabel('Files and tools', view) === null
    click(linkTo(view, portHref))
    const frame = await waitFor(
      () => view.querySelector('iframe[title^="Preview of port"]'),
      'a preview frame',
    )
    const shown = {
      column: queryByLabel('Files and tools', view) !== null,
      frame: frame.getAttribute('title'),
      at: navigation.href(),
      opens: await bodiesOf(server, 'POST', previewsPath(org, id), 0),
    }
    click(linkTo(view, agents))
    await settle()
    expect({ hidden, shown, page: navigation.href() }).toEqual({
      hidden: true,
      shown: {
        column: true,
        frame: 'Preview of port 8080',
        at: toolHref(org, id, 'preview', opened.id),
        opens: [{ port: 8080 }],
      },
      page: agents,
    })
  })

  test('in an archived workspace, a local address stays text', async () => {
    const server = new FakeApiServer({ workspaceState: 'archived' })
    const { view } = await openChat('phone', server)
    const text = await waitFor(
      () => queryByText(message.text, view),
      'the sent message',
    )
    expect({
      local: linksTo(view, portHref).length + linksTo(view, local).length,
      app: linksTo(text, agents).length,
    }).toEqual({ local: 0, app: 1 })
  })
})
