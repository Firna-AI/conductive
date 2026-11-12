// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { requestLines } from '../../app/test-kit'
import { rightClick } from '../../chat/components/tab-row-test-kit'
import { queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { serveSuspendedAcme } from '../../test-support/suspended-org'
import { openPaletteTab } from '../palette/palette-test-kit'
import { click, settle } from '../test-mount'
import { menuItem, menuOf, requestsFor, rowLink } from './row-menu-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace } = FAKE_IDS
const open = routes.workspace(org, workspace)

/** The link of a workspace of the fixtures. */
function linkOf(workspaceId: string): string {
  const { workspaces } = workspaceFixtures().workspaces
  const item = workspaces.find((row) => row.id === workspaceId)
  if (!item) throw new Error(`The fixture has no ${workspaceId}.`)
  return item.link
}

/** A clipboard that keeps each copied text, or refuses it while `refuse`. */
function clipboard() {
  const copied: string[] = []
  const state = { refuse: false }
  const copy = async (text: string | Promise<string>) => {
    if (state.refuse) throw new Error('The clipboard refused the text.')
    copied.push(await text)
  }
  return { copied, state, copy }
}

/** The titles of the toasts that show. */
function toasts(): string[] {
  const region = queryByRole('region', 'Notifications')
  if (!region) return []
  return Array.from(
    region.querySelectorAll('[role="status"], [role="alert"]'),
    (toast) => toast.textContent ?? '',
  )
}

/** The requests that change something. */
const writes = (server: FakeApiServer) =>
  requestLines(server).filter((line) => !line.startsWith('GET '))

describe('Copy link in the menu of a workspace row', () => {
  test('copies the link of the row, says "Link copied", gives the focus back to the row, and opens no workspace', async () => {
    const { copied, copy } = clipboard()
    const { server, navigation } = await openPaletteTab(open, { copy })
    const from = requestLines(server).length
    const link = rowLink('apple-pay')

    rightClick(link, { clientX: 120, clientY: 300 })
    click(menuItem('Copy link'))
    await settle()

    expect({
      copied,
      toasts: toasts(),
      menu: menuOf('Apple Pay button'),
      focus: document.activeElement === link,
      history: navigation.history,
      requests: requestsFor(server, 'apple-pay', from),
    }).toEqual({
      copied: [linkOf('apple-pay')],
      toasts: ['Link copied'],
      menu: [],
      focus: true,
      history: [open],
      requests: [],
    })
  })

  test('a row of a suspended org has a menu with only Copy link, and a refused copy asks to try again', async () => {
    const server = new FakeApiServer()
    serveSuspendedAcme(server)
    const { copied, state, copy } = clipboard()
    await openPaletteTab(routes.org(org), { server, copy })

    rightClick(rowLink('apple-pay'), { clientX: 120, clientY: 300 })
    const items = menuOf('Apple Pay button')
    state.refuse = true
    click(menuItem('Copy link'))
    await settle()

    expect({ items, copied, toasts: toasts(), writes: writes(server) }).toEqual(
      {
        items: ['Copy link'],
        copied: [],
        toasts: ["The link didn't copy. Try again."],
        writes: [],
      },
    )
  })
})
