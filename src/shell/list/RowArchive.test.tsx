// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { HeldRequests } from '../../app/test-kit'
import { rightClick } from '../../chat/components/tab-row-test-kit'
import {
  WORKSPACE_RESTORE_MS,
  workspacePath,
  workspacePaths,
} from '../../shared/workspaces'
import {
  accessibleName,
  byRole,
  byToast,
  queryByLabel,
  queryByRole,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import { openPaletteTab } from '../palette/palette-test-kit'
import { click, settle } from '../test-mount'
import {
  applePayReply,
  archiveShortcut,
  menuItem,
  requestsFor,
  rowLink,
} from './row-menu-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace } = FAKE_IDS
/** The open workspace: Checkout address autocomplete. */
const open = routes.workspace(org, workspace)

/** The title of the header of the open workspace, while it shows. */
function header(): string | null {
  return document.querySelector('h1')?.textContent ?? null
}

/** The reply of an Archive of a row, with the last day of its Restore. */
function archivedReply(workspaceId: string, restoreUntil: number | null) {
  const { workspaces, detail } = workspaceFixtures()
  const row = workspaces.workspaces.find((item) => item.id === workspaceId)
  if (!row) throw new Error(`The fixture has no ${workspaceId}.`)
  const archived = {
    ...row,
    state: 'archived' as const,
    archivedAt: FAKE_TIME,
    restoreUntil,
    updatedAt: FAKE_TIME + 1,
  }
  return { ...detail, workspace: archived }
}

/** The names of the dialogs that show. */
function dialogs(): string[] {
  return Array.from(
    document.querySelectorAll('[role="dialog"]'),
    accessibleName,
  )
}

describe('Archive from a workspace row', () => {
  test('Archive from another row, by its shortcut or its menu, sends one request over the open workspace, names a failure in a toast, and archives with no question', async () => {
    const server = new FakeApiServer()
    const archivePath = workspacePaths.archive(org, 'apple-pay')
    const unavailable = {
      error: {
        code: 'sandbox_unavailable',
        message: 'The cloud computer did not stop. Try again.',
      },
    }
    server.json('POST', archivePath, unavailable, 503)
    const { navigation } = await openPaletteTab(open, { server })
    const inCheckout = () =>
      byRole('region', 'Checkout').textContent?.includes('Apple Pay button')
    // The shortcut sends one request, and its failure keeps the row.
    click(archiveShortcut('apple-pay'))
    await settle()
    const failed = {
      dialogs: dialogs(),
      toast: byToast("Apple Pay button wasn't archived.").textContent,
      inCheckout: inCheckout(),
    }
    server.json(
      'POST',
      archivePath,
      applePayReply({
        state: 'archived',
        archivedAt: FAKE_TIME,
        restoreUntil: FAKE_TIME + WORKSPACE_RESTORE_MS,
        updatedAt: FAKE_TIME + 1,
      }),
    )
    // The menu archives the row at once.
    rightClick(rowLink('apple-pay'), { clientX: 120, clientY: 300 })
    click(menuItem('Archive'))
    await settle()
    const archives = server.requests.filter(
      (request) =>
        request.method === 'POST' && request.url.endsWith(archivePath),
    )

    expect({
      failed,
      writes: archives.length,
      body: await archives.at(-1)?.clone().json(),
      after: {
        dialogs: dialogs(),
        archived: byRole('region', 'Archived').textContent,
        inCheckout: inCheckout(),
        history: navigation.history,
        header: header(),
        toast: byToast('Apple Pay button is archived.').textContent,
      },
    }).toEqual({
      failed: {
        dialogs: [],
        toast:
          "Apple Pay button wasn't archived.The cloud computer did not stop. Try again.",
        inCheckout: true,
      },
      writes: 2,
      body: {},
      after: {
        dialogs: [],
        archived: 'Archived1',
        inCheckout: false,
        history: [open],
        header: 'Checkout address autocomplete',
        toast: 'Apple Pay button is archived.Restore',
      },
    })
  })

  test('Archive of the open row during its first read, by its shortcut or its menu, sends one request, its toast brings the workspace back, and the end of the read resumes nothing', async () => {
    // The spinner of the first read stays on its first frame.
    holdAnimationFrames()
    const server = new FakeApiServer({ workspaceState: 'stopped' })
    const held = new HeldRequests(server)
    const detail = workspacePath(org, workspace)
    const archivePath = workspacePaths.archive(org, workspace)
    // The app reads the workspace again as it starts, so each read waits.
    const reads = 3
    for (let read = 0; read < reads; read += 1) held.holdAnswer('GET', detail)
    await openPaletteTab(open, { server, fetch: held.fetch })
    const loading = queryByLabel('Opening the workspace') !== null
    held.holdAnswer('POST', archivePath)
    click(archiveShortcut(workspace))
    await settle()
    // While the Archive runs, its button is busy, and the menu sends nothing.
    const busy = archiveShortcut(workspace).getAttribute('aria-busy')
    rightClick(rowLink(workspace), { clientX: 120, clientY: 400 })
    click(menuItem('Archive'))
    await settle()
    const during = {
      dialogs: dialogs(),
      writes: requestsFor(server, workspace).filter((line) =>
        line.startsWith('POST'),
      ),
    }
    held.release('POST', archivePath)
    await settle()
    click(
      byRole(
        'button',
        'Restore',
        byToast('Checkout address autocomplete is archived.'),
      ),
    )
    await settle()
    for (let read = 0; read < reads; read += 1) held.release('GET', detail)
    await settle()

    expect({
      loading,
      busy,
      during,
      after: {
        dialogs: dialogs(),
        header: header(),
        resume: queryByRole('button', 'Resume') !== null,
      },
      writes: requestsFor(server, workspace).filter((line) =>
        line.startsWith('POST'),
      ),
    }).toEqual({
      loading: true,
      busy: 'true',
      during: { dialogs: [], writes: [`POST ${archivePath}`] },
      after: {
        dialogs: [],
        header: 'Checkout address autocomplete',
        resume: true,
      },
      writes: [
        `POST ${archivePath}`,
        `POST ${workspacePaths.restore(org, workspace)}`,
      ],
    })
  })

  test('the toast of an Archive offers Restore only while the workspace can come back', async () => {
    const server = new FakeApiServer()
    // A failed first start leaves no cloud computer to keep, and a repeated
    // Archive can give a Restore that already ended.
    server.json(
      'POST',
      workspacePaths.archive(org, 'apple-pay'),
      archivedReply('apple-pay', null),
    )
    server.json(
      'POST',
      workspacePaths.archive(org, 'pricing-copy'),
      archivedReply('pricing-copy', FAKE_TIME),
    )
    await openPaletteTab(open, { server })
    click(archiveShortcut('apple-pay'))
    await settle()
    click(archiveShortcut('pricing-copy'))
    await settle()
    expect([
      byToast('Apple Pay button is archived.').textContent,
      byToast('Pricing page copy is archived.').textContent,
    ]).toEqual([
      'Apple Pay button is archived.',
      'Pricing page copy is archived.',
    ])
  })
})
