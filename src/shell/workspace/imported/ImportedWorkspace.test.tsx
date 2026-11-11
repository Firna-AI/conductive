// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../../app/router'
import { conductorOldDocumentPath } from '../../../shared/conductor-import'
import { filePaths } from '../../../shared/files'
import type { ImportSessionMetadata } from '../../../shared/import-session'
import { sessionsPath, type Session } from '../../../shared/sessions'
import { workspacePaths } from '../../../shared/workspaces'
import { textOf } from '../../test-render'
import { byRole, queryByRole } from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import {
  importedFixtures,
  type FakeImport,
} from '../../../test-support/fake-import-routes'
import {
  FAKE_IDS,
  FAKE_ORIGIN,
  fakeUser,
} from '../../../test-support/fixtures/core'
import { fakeOldDocuments } from '../../../test-support/fixtures/old-documents'
import { workspaceFixtures } from '../../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../../test-support/mount'
import { archiveShortcut } from '../../list/row-menu-test-kit'
import { click, settle } from '../../test-mount'
import { documentHref } from '../documents/document-address'
import { emit } from '../kept-test-kit'
import { shownWorkspaces } from '../tab-memory'
import { linkTo, linksTo, openTab } from '../wiring-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS

/** The number of requests to `path`, a route of the fake API. */
function sent(server: FakeApiServer, method: string, path: string): number {
  const address = new URL(path, FAKE_ORIGIN).href
  return server.requests.filter(
    (request) => request.method === method && request.url === address,
  ).length
}

/** The Activate and Resume requests that the page sent. */
const starts = (server: FakeApiServer) =>
  sent(server, 'POST', workspacePaths.activate(org, id)) +
  sent(server, 'POST', workspacePaths.resume(org, id))

async function openImported(imported: FakeImport) {
  holdAnimationFrames()
  const server = new FakeApiServer({ imported })
  const { view, app } = await openTab(server, routes.workspace(org, id))
  // The kept files of the workspace. A connected store takes the file
  // snapshot of the fake stream, so a store that connected has a tree.
  const files = () => shownWorkspaces(app, fakeUser).files(org, id)
  return { server, view, files }
}

/**
 * The open session of the fake workspace as a session that continues the
 * old session `documentId`, before or after the runner learns that its
 * agent could not resume it.
 */
function continuing(
  documentId: string,
  preparation: ImportSessionMetadata['preparation'],
): Session {
  const open = workspaceFixtures().sessions.sessions.find(
    (session) => session.id === FAKE_IDS.session,
  )
  if (!open) throw new Error('The open session fixture is missing.')
  return { ...open, conductorImport: { documentId, preparation } }
}

/** The texts of the bars and the notices that the page announces. */
function alerts(view: HTMLElement): string[] {
  return Array.from(view.querySelectorAll('[role="alert"]'), (bar) =>
    textOf(bar.innerHTML),
  )
}

describe('an import before its activation', () => {
  test('shows Activate and its old sessions in place of an empty chat, and connects no files and starts nothing', async () => {
    const { server, view, files } = await openImported('inactive')
    const links = byRole('region', 'Sessions from Conductor', view)
    expect(
      Array.from(links.querySelectorAll('li a'), (link) => link.textContent),
    ).toEqual([
      'CXCoupon edge cases in tests14 messages · 9 Jan',
      'CLApply coupons before tax33 messages · 8 Jan',
      'CLExplain the basket totals6 messages · 2 Jan',
    ])
    expect(view.textContent).toContain('Activate this workspace')
    expect(view.textContent).toContain(
      'A cloud computer starts with your work from Conductor.',
    )
    expect(files().getSnapshot().tree).toBe(null)
    expect(sent(server, 'GET', filePaths.tree(org, id))).toBe(0)
    expect(starts(server)).toBe(0)
  })

  test('an old session opens its document from the routes of the app, and starts nothing', async () => {
    const { server, view } = await openImported('inactive')
    const document = fakeOldDocuments[1]
    click(linkTo(view, documentHref(org, id, document.id)))
    await settle()
    const page = queryByRole('region', 'Apply coupons before tax', view)
    expect(page).not.toBeNull()
    expect(page?.textContent).toContain('Conductor/Apply coupons before tax')
    expect(page?.textContent).toContain('33 messages')
    expect(
      sent(server, 'GET', conductorOldDocumentPath(org, id, document.id)),
    ).toBe(1)
    expect(sent(server, 'GET', filePaths.tree(org, id))).toBe(0)
    expect(starts(server)).toBe(0)
  })

  test('Archive asks the question first, Cancel archives nothing, and Archive of the question archives', async () => {
    const { server, view } = await openImported('inactive')
    const archives = () => sent(server, 'POST', workspacePaths.archive(org, id))
    const title = 'Archive Checkout address autocomplete?'
    click(archiveShortcut(id))
    await settle()
    const question = queryByRole('dialog', title)
    expect(question).not.toBeNull()
    expect(question?.textContent).toContain(
      'It cannot be activated while archived. Its old sessions stay readable.',
    )
    expect(archives()).toBe(0)
    click(byRole('button', 'Cancel', byRole('dialog', title)))
    await settle()
    expect(archives()).toBe(0)
    click(archiveShortcut(id))
    await settle()
    click(byRole('button', 'Archive', byRole('dialog', title)))
    await settle()
    expect(archives()).toBe(1)
    expect(view.textContent).toContain(
      'Its sessions from Conductor stay readable.',
    )
    expect(view.textContent).not.toContain('Its cloud computer is deleted')
  })
})

describe('a failed activation', () => {
  test('names its cause and keeps the work from Conductor, with Try again', async () => {
    const { server, view } = await openImported('failed')
    expect(alerts(view)).toEqual([
      "The workspace couldn't be activated The cloud computer did not start. Your work from Conductor is kept. Try again",
    ])
    expect(starts(server)).toBe(0)
  })

  test('Try again by another member shows the new early session of its reply, beside the open session of the first attempt', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ imported: 'failed' })
    const [record] = workspaceFixtures().sessions.sessions
    const first = { ...record, id: 'first-attempt', title: 'First attempt' }
    const early = { ...record, id: 'second-attempt', title: null }
    server.json('GET', sessionsPath(org, id), {
      eventNumber: 0,
      sessions: [first],
      history: [],
    })
    server.json('POST', workspacePaths.activate(org, id), {
      ...importedFixtures('failed').activation,
      sessionId: early.id,
    })
    const { view } = await openTab(server, routes.workspace(org, id))
    const shown = () =>
      view.querySelector('li button[aria-current="page"]')?.textContent
    expect(shown()).toBe('First attempt')
    click(byRole('button', 'Try again', view))
    await settle()
    // The server stores the early session before its reply, and the stream
    // brings its record after the reply.
    emit(server, { type: 'session.updated', session: early })
    await settle()
    expect(shown()).toBe('Untitled')
    expect(starts(server)).toBe(1)
  })
})

describe('an activated import', () => {
  test('a continued session names its old session, then says that it could not resume, and its title opens the document', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ imported: 'ready' })
    const document = fakeOldDocuments[1]
    const { sessions } = workspaceFixtures()
    server.json('GET', sessionsPath(org, id), {
      ...sessions,
      sessions: sessions.sessions.map((session) =>
        session.id === FAKE_IDS.session
          ? continuing(document.id, 'prepared')
          : session,
      ),
    })
    const { view, navigation } = await openTab(
      server,
      routes.workspace(org, id),
    )
    expect(view.textContent).toContain(
      'Continues Apply coupons before tax from Conductor',
    )
    // The Worker stores the fallback and streams the session when the
    // runner reports that the agent could not resume the old session.
    emit(server, {
      type: 'session.updated',
      session: continuing(document.id, 'fallback'),
    })
    await settle()
    expect(view.textContent).toContain(
      "Apply coupons before tax couldn't resume, so this session started fresh with its old chat",
    )
    expect(view.textContent).not.toContain('Continues Apply coupons')
    const href = documentHref(org, id, document.id)
    const links = linksTo(view, href)
    expect(links.map((link) => link.textContent)).toEqual([
      'Apply coupons before tax',
    ])
    click(links[0])
    await settle()
    expect(navigation.href()).toBe(href)
    const page = queryByRole('region', 'Apply coupons before tax', view)
    expect(page).not.toBeNull()
    expect(page?.textContent).toContain('33 messages')
    expect(
      sent(server, 'GET', conductorOldDocumentPath(org, id, document.id)),
    ).toBe(1)
  })
})
