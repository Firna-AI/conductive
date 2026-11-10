// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { HeldRequests } from '../../app/test-kit'
import { repositoryBranchesPath } from '../../shared/workspace-branches'
import {
  accessibleName,
  byRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { click, press, settle, typeText } from '../test-mount'
import { org } from '../workspace/kept-test-kit'
import {
  branchReads,
  branchRows,
  pageOf,
  pickerRows,
  searchField,
  serverWithBranches,
  storefront,
} from './branch-test-kit'
import { keyDown, mainOf, openTab, serverWith } from './dialog-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const fork = 'https://github.com/acme/storefront/pull/477'
const reason = 'Its branch is in another repository.'
/** The rows of the mockups, with the check of a choice of `checked`. */
const rowsWith = (checked: string) =>
  [
    'New branch, from main',
    '#486 Gift cards at checkout',
    '#482 Add address autocomplete to checkout',
    `#477 Polish translations for checkout (off: ${reason})`,
    `Open on GitHub (#477 Polish translations for checkout) → ${fork}`,
    'calummoore/oslo-3f8k',
    'jonasweber/next-16-images',
    'priyaraman/footer-links',
  ].map((row) => (row === checked ? `${row} ✓` : row))

describe('the branch picker of the New workspace page', () => {
  test('the line under the repository opens the picker with the search focused and New branch checked, a pull request from a fork is off with Open on GitHub, and a chosen branch gives the focus back to Change, shows on the line, and stays checked at a reopen', async () => {
    const server = serverWithBranches('page')
    const tab = await openTab(server, { at: routes.newWorkspace(org) })
    const main = mainOf(tab.view)
    const line = queryByText('New branch from main', main) !== null
    click(byRole('button', 'Use an existing branch', main))
    await settle()
    const field = searchField(main)
    const opened = {
      focus: document.activeElement === field,
      rows: pickerRows(main),
    }
    press(field, 'ArrowDown')
    const down = accessibleName(document.activeElement ?? document.body)
    press(document.activeElement ?? document.body, 'ArrowUp')
    const up = document.activeElement === field
    click(byRole('menuitemradio', 'calummoore/oslo-3f8k', main))
    await settle()
    const change = byRole('button', 'Change the branch', main)
    const chosen = {
      picker: queryByRole('menu', 'Branch', main),
      focus: document.activeElement === change,
      line: queryByText('Continues calummoore/oslo-3f8k', main) !== null,
      body: queryByText('Your first message creates it.', main) !== null,
      newBranch: /new branch/i.test(main.textContent ?? ''),
    }
    click(change)
    await settle()
    expect({
      line,
      opened,
      down,
      up,
      chosen,
      reopened: pickerRows(main),
      reads: branchReads(server),
    }).toEqual({
      line: true,
      opened: { focus: true, rows: rowsWith('New branch, from main') },
      down: 'New branch, from main',
      up: true,
      chosen: {
        picker: null,
        focus: true,
        line: true,
        body: true,
        newBranch: false,
      },
      reopened: rowsWith('calummoore/oslo-3f8k'),
      reads: [pageOf('')],
    })
  })

  test('on a phone, the picker fills a sheet that holds the page and gives the focus to the checked row, with the same row of a fork, and a chosen pull request closes the sheet and shows on the line', async () => {
    const server = serverWithBranches('page')
    const tab = await openTab(server, {
      at: routes.newWorkspace(org),
      viewport: 'phone',
    })
    const main = mainOf(tab.view)
    const link = byRole('button', 'Use an existing branch', main)
    click(link)
    await settle()
    const sheet = byRole('dialog', 'Branch')
    const opened = {
      behind: link.closest('[inert]') !== null,
      focus: accessibleName(document.activeElement ?? document.body),
      fork: pickerRows(sheet).slice(3, 5),
    }
    click(byRole('menuitemradio', '#486 Gift cards at checkout', sheet))
    await settle()
    expect({
      opened,
      sheet: queryByRole('dialog', 'Branch'),
      focus: document.activeElement === link,
      line: queryByText('Continues #486 Gift cards at checkout', main) !== null,
    }).toEqual({
      opened: {
        behind: true,
        focus: 'New branch, from main',
        fork: rowsWith('').slice(3, 5),
      },
      sheet: null,
      focus: true,
      line: true,
    })
  })

  test('the picker says while its list loads, shows a failure with Try again, adds the next page with Show more and gives the focus to its first row, and says when a search finds nothing, with New branch in each state', async () => {
    const message = 'GitHub is not available. Try again.'
    const server = serverWith('page')
    server.json(
      'GET',
      pageOf(''),
      { error: { code: 'github_unavailable', message } },
      502,
    )
    const held = new HeldRequests(server)
    const tab = await openTab(server, {
      at: routes.newWorkspace(org),
      fetch: held.fetch,
    })
    const main = mainOf(tab.view)
    const list = repositoryBranchesPath(org, storefront.id)
    const field = () => searchField(main)
    const newBranch = () =>
      queryByRole('menuitemradio', 'New branch, from main', main) !== null
    held.holdAnswer('GET', list)
    click(byRole('button', 'Use an existing branch', main))
    await settle()
    const loading = {
      text: queryByText('Loading branches', main) !== null,
      newBranch: newBranch(),
    }
    held.release('GET', list)
    await settle()
    const failed = {
      title: queryByText("The branches didn't load", main) !== null,
      body: queryByText(message, main) !== null,
      newBranch: newBranch(),
    }
    server.json('GET', pageOf(''), {
      rows: branchRows.slice(0, 4),
      nextCursor: 'n2',
    })
    server.json('GET', pageOf('', 'n2'), {
      rows: branchRows.slice(4),
      nextCursor: null,
    })
    click(byRole('button', 'Try again', main))
    await settle()
    const retried = {
      rows: pickerRows(main).length,
      focus: document.activeElement === field(),
    }
    click(byRole('menuitem', 'Show more', main))
    await settle()
    const more = {
      rows: pickerRows(main).length,
      showMore: queryByRole('menuitem', 'Show more', main),
      focus: accessibleName(document.activeElement ?? document.body),
    }
    server.json('GET', pageOf('tax'), { rows: [], nextCursor: null })
    typeText(field(), 'tax')
    keyDown(field(), { key: 'Enter' })
    await settle()
    expect({
      loading,
      failed,
      retried,
      more,
      none: {
        note:
          queryByText('No branch or pull request matches "tax".', main) !==
          null,
        newBranch: newBranch(),
      },
    }).toEqual({
      loading: { text: true, newBranch: true },
      failed: { title: true, body: true, newBranch: true },
      // New branch, three pull requests with the link of the fork, a branch,
      // and Show more.
      retried: { rows: 7, focus: true },
      more: { rows: 8, showMore: null, focus: 'jonasweber/next-16-images' },
      none: { note: true, newBranch: true },
    })
  })
})
