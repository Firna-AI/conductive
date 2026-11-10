// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { HeldRequests, requestLines } from '../../app/test-kit'
import { rightClick } from '../../chat/components/tab-row-test-kit'
import { workspaceOwnerPath } from '../../shared/members'
import {
  workspacePath,
  workspacePaths,
  type Workspace,
} from '../../shared/workspaces'
import {
  accessibleName,
  byRole,
  queryByLabel,
  queryByRole,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, fakeUsers } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import {
  openPaletteTab,
  palette,
  pressPaletteKey,
} from '../palette/palette-test-kit'
import { click, press, settle } from '../test-mount'
import {
  archiveShortcut,
  hover,
  menuItem,
  menuOf,
  requestsFor,
  rowLink,
} from './row-menu-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace } = FAKE_IDS
/** The open workspace: Checkout address autocomplete. */
const open = routes.workspace(org, workspace)

/** The reply of a write of Apple Pay button, with `change` applied. */
function applePayReply(change: Partial<Workspace>) {
  const { workspaces, detail } = workspaceFixtures()
  const applePay = workspaces.workspaces.find((item) => item.id === 'apple-pay')
  if (!applePay) throw new Error('The fixture has no Apple Pay button.')
  return { ...detail, workspace: { ...applePay, ...change } }
}

/** The title of the header of the open workspace, while it shows. */
function header(): string | null {
  return document.querySelector('h1')?.textContent ?? null
}

/** The names of the dialogs that show. */
function dialogs(): string[] {
  return Array.from(
    document.querySelectorAll('[role="dialog"]'),
    accessibleName,
  )
}

describe('the actions of a workspace row', () => {
  test('Archive from another row, by its shortcut or its menu, asks the one existing question over the open workspace, offers Try again after a failed check, and archives only after the confirmation', async () => {
    const server = new FakeApiServer()
    const check = workspacePaths.archiveCheck(org, 'apple-pay')
    const work = { uncommittedFiles: ['src/app/pay.ts'], unpushedCommits: 1 }
    const stopped = {
      error: {
        code: 'sandbox_stopped',
        message: 'Open the workspace to check its saved work. Then try again.',
      },
    }
    server.json('GET', check, stopped, 409)
    const { navigation } = await openPaletteTab(open, { server })
    const failed = () => ({
      dialogs: dialogs(),
      text: queryByRole('dialog', 'Archive Apple Pay button?')?.textContent,
    })
    // The check fails, and the question offers Cancel and Try again.
    const question = {
      dialogs: ['Archive Apple Pay button?'],
      text: "Archive Apple Pay button?The check didn't finishOpen the workspace to check its saved work. Then try again.CancelTry again",
    }
    click(archiveShortcut('apple-pay'))
    await settle()
    expect(failed()).toEqual(question)
    click(
      byRole('button', 'Cancel', byRole('dialog', 'Archive Apple Pay button?')),
    )
    const cancelled = dialogs()
    rightClick(rowLink('apple-pay'), { clientX: 120, clientY: 300 })
    click(menuItem('Archive'))
    await settle()
    // The menu asks the same question of the row.
    expect({ cancelled, menu: failed() }).toEqual({
      cancelled: [],
      menu: question,
    })
    server.json('GET', check, work)
    click(
      byRole(
        'button',
        'Try again',
        byRole('dialog', 'Archive Apple Pay button?'),
      ),
    )
    await settle()
    const confirm = {
      dialogs: dialogs(),
      requests: requestsFor(server, 'apple-pay'),
    }
    click(byRole('button', 'Archive anyway'))
    await settle()
    const archive = server.requests.find(
      (request) =>
        request.method === 'POST' &&
        request.url.endsWith(workspacePaths.archive(org, 'apple-pay')),
    )
    const archivedGroup = byRole('region', 'Archived')

    expect({
      confirm,
      body: await archive?.json(),
      after: {
        dialogs: dialogs(),
        archived: archivedGroup.textContent,
        inCheckout: byRole('region', 'Checkout').textContent?.includes(
          'Apple Pay button',
        ),
        history: navigation.history,
        header: header(),
      },
    }).toEqual({
      confirm: {
        dialogs: ['Archive with work that is not pushed?'],
        requests: [`GET ${check}`, `GET ${check}`, `GET ${check}`],
      },
      body: { discardUnpushedWork: true },
      after: {
        dialogs: [],
        archived: 'Archived1',
        inCheckout: false,
        history: [open],
        header: 'Checkout address autocomplete',
      },
    })
  })

  test('Archive of the open row during its first read, by its shortcut or its menu, shows the one question of its page, which stays when the read ends', async () => {
    // The spinner of the first read stays on its first frame.
    holdAnimationFrames()
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    const detail = workspacePath(org, workspace)
    // The app reads the workspace again as it starts, so each read waits.
    const reads = 3
    for (let read = 0; read < reads; read += 1) held.holdAnswer('GET', detail)
    await openPaletteTab(open, { server, fetch: held.fetch })
    const loading = queryByLabel('Opening the workspace') !== null
    const question = 'Archive with work that is not pushed?'
    click(archiveShortcut(workspace))
    await settle()
    // The shortcut shows the one question of the page.
    expect(dialogs()).toEqual([question])
    click(byRole('button', 'Cancel', byRole('dialog', question)))
    rightClick(rowLink(workspace), { clientX: 120, clientY: 400 })
    click(menuItem('Archive'))
    await settle()
    const during = dialogs()
    for (let read = 0; read < reads; read += 1) held.release('GET', detail)
    await settle()
    const after = { dialogs: dialogs(), header: header() }
    click(byRole('button', 'Cancel', byRole('dialog', after.dialogs[0] ?? '')))
    await settle()

    expect({
      loading,
      during,
      after,
      closed: dialogs(),
      archives: requestsFor(server, workspace).filter((line) =>
        line.startsWith('POST'),
      ),
    }).toEqual({
      loading: true,
      during: ['Archive with work that is not pushed?'],
      after: {
        dialogs: ['Archive with work that is not pushed?'],
        header: 'Checkout address autocomplete',
      },
      closed: [],
      archives: [],
    })
  })

  test('Reassign to changes the owner of the row, and a refused change keeps the menu open with its error', async () => {
    // The spinner of the change that runs stays on its first frame.
    holdAnimationFrames()
    const server = new FakeApiServer()
    const owner = workspaceOwnerPath(org, 'apple-pay')
    const priya = fakeUsers[1]
    server.json(
      'PUT',
      owner,
      {
        error: { code: 'user_suspended', message: 'Priya Raman is suspended.' },
      },
      409,
    )
    const held = new HeldRequests(server)
    await openPaletteTab(open, { server, fetch: held.fetch })
    rightClick(rowLink('apple-pay'), { clientX: 120, clientY: 300 })
    click(menuItem('Reassign to'))
    await settle()
    click(menuItem('Priya Raman'))
    await settle()
    const choices = byRole('menu', 'Owner').parentElement
    const refused = {
      menu: menuOf('Apple Pay button').length,
      error: choices?.querySelector('[role="alert"]')?.textContent ?? null,
    }
    server.json('PUT', owner, applePayReply({ owner: priya }))
    held.holdAnswer('PUT', owner)
    click(menuItem('Priya Raman'))
    await settle()
    // While the change runs, the menu and its owner choices stay: the
    // palette key, Escape, Left, and the other items of the menu do nothing.
    pressPaletteKey('other')
    press(document.activeElement ?? document.body, 'Escape')
    const afterEscape = menuOf('Owner').length
    press(document.activeElement ?? document.body, 'ArrowLeft')
    const afterLeft = menuOf('Owner').length
    hover(menuItem('Move to section'))
    click(menuItem('Move to section'))
    click(menuItem('Rename'))
    const saving = {
      menu: menuOf('Apple Pay button').length,
      afterEscape,
      afterLeft,
      owners: menuOf('Owner').length,
      sections: menuOf('Section'),
      field: queryByRole('textbox', 'Workspace name'),
      palette: palette() !== null,
    }
    held.release('PUT', owner)
    await settle()
    const closed = menuOf('Apple Pay button')
    rightClick(rowLink('apple-pay'), { clientX: 120, clientY: 300 })
    click(menuItem('Reassign to'))
    await settle()
    const owners = menuOf('Owner')
    press(document.activeElement ?? document.body, 'Escape')

    expect({
      refused,
      saving,
      closed,
      owners,
      writes: requestsFor(server, 'apple-pay').filter(
        (line) => !line.startsWith('GET'),
      ),
      openOwner: requestLines(server).filter(
        (line) => line === `PUT ${workspaceOwnerPath(org, workspace)}`,
      ),
    }).toEqual({
      refused: {
        menu: 4,
        error: 'The owner did not change. Priya Raman is suspended.',
      },
      saving: {
        menu: 4,
        afterEscape: 3,
        afterLeft: 3,
        owners: 3,
        sections: [],
        field: null,
        palette: false,
      },
      closed: [],
      owners: ['Cal', 'Priya Raman (checked)', 'Jonas Weber'],
      writes: [`PUT ${owner}`, `PUT ${owner}`],
      openOwner: [],
    })
  })
})
