import { repositoryBranchesPath } from '../../shared/branches'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import type { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { click, settle } from '../test-mount'
import { org } from '../workspace/kept-test-kit'

// The helpers of the tests of the branch control of New workspace.

export const task = 'Let shoppers save their cart.'
export const picked = 'calummoore/checkout-autocomplete'
export const branchesPath = repositoryBranchesPath(org, 'storefront')
const hour = 3_600_000

/** The branches of acme/storefront, as the Worker lists them. */
export function serveBranches(server: FakeApiServer): void {
  server.json('GET', branchesPath, {
    branches: [
      { name: 'main', committedAt: FAKE_TIME - 9 * hour },
      { name: 'priyaraman/checkout-tax-rates', committedAt: FAKE_TIME - hour },
      { name: picked, committedAt: FAKE_TIME - 2 * hour },
      { name: 'develop', committedAt: FAKE_TIME - 24 * hour },
    ],
  })
}

/** The number of reads of the branch list that the server got. */
export const reads = (server: FakeApiServer) =>
  server.requests.filter(
    (request) => new URL(request.url).pathname === branchesPath,
  ).length

/**
 * The rows of the Start from list of the open dropdown: the name and the
 * detail, and a check mark.
 */
export function rowsIn(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('[role="option"]'), (row) => {
    const parts = Array.from(row.children, (part) => part.textContent ?? '')
    const text = parts.filter((part) => part !== '').join(' ')
    return row.getAttribute('aria-selected') === 'true' ? `${text} ✓` : text
  })
}

/** The row of a branch in the Start from list of the open dropdown. */
export function rowOf(root: HTMLElement, name: string): HTMLElement {
  const row = Array.from(
    root.querySelectorAll<HTMLElement>('[role="option"]'),
  ).find((item) => item.firstElementChild?.textContent === name)
  if (!row) throw new Error(`The dropdown has no row ${name}.`)
  return row
}

/**
 * The rows of the Target part of the open dropdown, each with a check mark
 * on the target, or null when the dropdown has no Target part.
 */
export function targetsIn(root: HTMLElement): string[] | null {
  const group = queryByRole('radiogroup', 'Target', root)
  if (!group) return null
  return Array.from(group.querySelectorAll('[role="radio"]'), (row) => {
    const name = row.textContent ?? ''
    return row.getAttribute('aria-checked') === 'true' ? `${name} ✓` : name
  })
}

/**
 * Picks a branch through the control, as a person does. `from` follows
 * "Branch: " in the spoken name of the control.
 */
export async function pickBranch(
  root: HTMLElement,
  from: string,
  name: string,
) {
  click(byRole('button', `Branch: ${from}`, root))
  await settle()
  click(rowOf(root, name))
  await settle()
}
