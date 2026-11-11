// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { HeldRequests, requestLines } from '../../app/test-kit'
import { rightClick } from '../../chat/components/tab-row-test-kit'
import { workspaceOwnerPath } from '../../shared/members'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, fakeUsers } from '../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import { openPaletteTab, palette } from '../palette/palette-test-kit'
import { pressCommand } from '../shortcuts/shortcut-test-kit'
import { click, press, settle } from '../test-mount'
import {
  applePayReply,
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

describe('the actions of a workspace row', () => {
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
    pressCommand('command-palette', 'other')
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
