import { branchPagePath } from '../../app/branch-list'
import { requestLines } from '../../app/test-kit'
import { repositoryBranchesPath } from '../../shared/workspace-branches'
import { accessibleName, byRole } from '../../test-support/dom-queries'
import type { FakeApiServer } from '../../test-support/fake-api'
import { branchFixtures } from '../../test-support/fixtures/branches'
import { repositoryFixtures } from '../../test-support/fixtures/repositories'
import { org } from '../workspace/kept-test-kit'
import { serverWith } from './dialog-test-kit'

// The helpers of the tests of the branch picker of New workspace.

/** The repository that a new form of Acme starts with: its first chosen one. */
export const storefront = (() => {
  const chosen = repositoryFixtures(org).repositories.repositories.find(
    (item) => item.selected,
  )
  if (!chosen) throw new Error('Acme has no chosen repository.')
  return chosen
})()

/** The rows of the mockups, as the Worker sends them for the repository. */
export const branchRows = branchFixtures(storefront)

/** The label of the search field of the picker. */
const searchLabel = 'Search branches and pull requests'

/** The search field of the open picker in `root`. */
export function searchField(root: HTMLElement): HTMLInputElement {
  const field = byRole('textbox', searchLabel, root)
  if (!(field instanceof HTMLInputElement)) {
    throw new Error('The search of the picker is not a text field.')
  }
  return field
}

/** The path of one page of the list of the repository. */
export const pageOf = (query: string, cursor: string | null = null) =>
  branchPagePath(org, storefront.id, query, cursor)

/** The fake API of a form whose repository lists the rows of the mockups. */
export function serverWithBranches(view: 'page' | 'dialog'): FakeApiServer {
  const server = serverWith(view)
  server.json('GET', pageOf(''), { rows: branchRows, nextCursor: null })
  return server
}

/** The pages of the list that the server got, in their order. */
export function branchReads(server: FakeApiServer): string[] {
  const list = repositoryBranchesPath(org, storefront.id)
  return requestLines(server)
    .map((line) => line.replace(/^GET /, ''))
    .filter((path) => path.startsWith(list))
}

/** The description of an element, from `aria-describedby`. */
function descriptionOf(element: Element): string {
  const ids = element.getAttribute('aria-describedby')?.split(/\s+/) ?? []
  return ids.map((id) => document.getElementById(id)?.textContent).join(' ')
}

/**
 * The rows of the open picker in `root`, as a person meets them with the
 * arrow keys: each name, with ✓ on the checked choice, the reason of a row
 * that is off, and the address of a link.
 */
export function pickerRows(root: HTMLElement): string[] {
  const menu = byRole('menu', 'Branch', root)
  return Array.from(
    menu.querySelectorAll<HTMLElement>('[role^="menuitem"]'),
    (item) => {
      const name = accessibleName(item)
      if (item.getAttribute('aria-checked') === 'true') return `${name} ✓`
      if (item.getAttribute('aria-disabled') === 'true') {
        return `${name} (off: ${descriptionOf(item)})`
      }
      if (item instanceof HTMLAnchorElement) {
        return `${name} (${descriptionOf(item)}) → ${item.href}`
      }
      return name
    },
  )
}
