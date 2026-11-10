// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { HeldRequests } from '../../app/test-kit'
import { repositoryBranchesPath } from '../../shared/workspace-branches'
import { byRole, queryByText } from '../../test-support/dom-queries'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { click, press, settle } from '../test-mount'
import { org } from '../workspace/kept-test-kit'
import {
  branchRows,
  focusedPart,
  pageOf,
  pickerRows,
  pressEnter,
  storefront,
} from './branch-test-kit'
import { mainOf, openTab, serverWith } from './dialog-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const list = repositoryBranchesPath(org, storefront.id)
const search = 'Search branches and pull requests'
const unavailable = {
  error: {
    code: 'github_unavailable',
    message: 'GitHub is not available. Try again.',
  },
}

/** Presses an arrow key on the focused part, and reads the next one. */
function arrow(key: 'ArrowDown' | 'ArrowUp'): string {
  press(document.activeElement ?? document.body, key)
  return focusedPart()
}

/** The page of New workspace with its picker open, over held answers. */
async function openPicker(server: ReturnType<typeof serverWith>) {
  const held = new HeldRequests(server)
  const tab = await openTab(server, {
    at: routes.newWorkspace(org),
    fetch: held.fetch,
  })
  const main = mainOf(tab.view)
  click(byRole('button', 'Use an existing branch', main))
  await settle()
  return { held, main }
}

describe('the keys of the branch picker', () => {
  test('the arrow keys reach Try again of a first page that did not load, Enter reads the page again, and the search field keeps the focus', async () => {
    const server = serverWith('page')
    server.json('GET', pageOf(''), unavailable, 502)
    const { held, main } = await openPicker(server)
    const walk = [arrow('ArrowDown'), arrow('ArrowDown'), arrow('ArrowDown')]
    const back = arrow('ArrowUp')
    server.json('GET', pageOf(''), { rows: branchRows, nextCursor: null })
    held.holdAnswer('GET', list)
    pressEnter()
    await settle()
    const reading = {
      loading: queryByText('Loading branches', main) !== null,
      focus: focusedPart(),
    }
    held.release('GET', list)
    await settle()
    expect({
      walk,
      back,
      reading,
      loaded: { focus: focusedPart(), rows: pickerRows(main).length },
    }).toEqual({
      walk: ['New branch, from main ✓', 'Try again', search],
      back: 'Try again',
      reading: { loading: true, focus: search },
      loaded: { focus: search, rows: 8 },
    })
  })

  test('the arrow keys walk the rows, a pull request from a fork with its reason and Open on GitHub, and Try again of a later page that did not load, and Enter reads it again while Show more keeps the focus until the first row of the page takes it', async () => {
    const server = serverWith('page')
    server.json('GET', pageOf(''), {
      rows: branchRows.slice(0, 4),
      nextCursor: 'n2',
    })
    server.json('GET', pageOf('', 'n2'), unavailable, 502)
    const { held, main } = await openPicker(server)
    click(byRole('menuitem', 'Show more', main))
    await settle()
    const failed = queryByText("More branches didn't load", main) !== null
    const start = focusedPart()
    const walk = Array.from({ length: 8 }, () => arrow('ArrowDown'))
    const back = arrow('ArrowUp')
    server.json('GET', pageOf('', 'n2'), {
      rows: branchRows.slice(4),
      nextCursor: null,
    })
    held.holdAnswer('GET', list)
    pressEnter()
    await settle()
    const reading = focusedPart()
    held.release('GET', list)
    await settle()
    expect({
      failed,
      start,
      walk,
      back,
      reading,
      loaded: focusedPart(),
    }).toEqual({
      failed: true,
      start: search,
      walk: [
        'New branch, from main ✓',
        '#486 Gift cards at checkout',
        '#482 Add address autocomplete to checkout',
        '#477 Polish translations for checkout (off: Its branch is in another repository.)',
        'Open on GitHub (#477 Polish translations for checkout) → https://github.com/acme/storefront/pull/477',
        'calummoore/oslo-3f8k',
        'Try again',
        search,
      ],
      back: 'Try again',
      reading: 'Show more (off)',
      loaded: 'jonasweber/next-16-images',
    })
  })
})
