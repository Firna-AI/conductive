import { describe, expect, it } from 'vitest'
import type { RepositoryBranchesResponse } from '../shared/branches'
import { ApiError } from './api/client'
import { branchRows, type BranchRows } from './branch-rows'
import { loading, ready, type Loadable } from './store'

const hour = 3_600_000
const list: RepositoryBranchesResponse = {
  branches: [
    { name: 'calummoore/fix-cart-flake', committedAt: 8 * hour },
    { name: 'priyaraman/Checkout-tax-rates', committedAt: 7 * hour },
    { name: 'calummoore/checkout-autocomplete', committedAt: 6 * hour },
    { name: 'main', committedAt: 5 * hour },
    { name: 'develop', committedAt: null },
  ],
}
const onMain = { name: 'main', defaultBranch: 'main' }

/** The names of the rows, the checked one marked, and the status. */
function shown(result: BranchRows) {
  return {
    rows: result.rows.map((row) => (row.checked ? `${row.name} ✓` : row.name)),
    status: result.status,
  }
}

function failed(code: string): Loadable<RepositoryBranchesResponse> {
  return { state: 'failed', error: new ApiError(502, code, 'It failed.') }
}

describe('the rows of the branch picker', () => {
  it('lists the default branch first with no time, then the other branches in the order of the Worker, and checks the branch of the form', () => {
    const rows = branchRows(
      ready(list),
      { name: 'calummoore/checkout-autocomplete', defaultBranch: 'main' },
      '',
    ).rows
    expect(
      rows.map((row) => [
        row.name,
        row.isDefault,
        row.committedAt,
        row.checked,
      ]),
    ).toEqual([
      ['main', true, null, false],
      ['calummoore/fix-cart-flake', false, 8 * hour, false],
      ['priyaraman/Checkout-tax-rates', false, 7 * hour, false],
      ['calummoore/checkout-autocomplete', false, 6 * hour, true],
      ['develop', false, null, false],
    ])
  })

  it('keeps each branch whose name holds the search in any case, also the default branch, and names a search without a match', () => {
    expect({
      checkout: shown(branchRows(ready(list), onMain, ' checkout ')),
      ai: shown(branchRows(ready(list), onMain, 'AI')),
      none: shown(branchRows(ready(list), onMain, ' zipcode ')),
    }).toEqual({
      checkout: {
        rows: [
          'priyaraman/Checkout-tax-rates',
          'calummoore/checkout-autocomplete',
        ],
        status: null,
      },
      ai: { rows: ['main ✓'], status: null },
      none: { rows: [], status: { kind: 'no-match', query: 'zipcode' } },
    })
  })

  it('shows the default branch in each state of the list, with the line of a list that loads, a failed read, or a GitHub account without access', () => {
    expect({
      loading: shown(branchRows(loading, onMain, '')),
      failed: shown(branchRows(failed('github_unavailable'), onMain, '')),
      offline: shown(branchRows(failed('network'), onMain, '')),
      noAccess: shown(branchRows(failed('github_access_required'), onMain, '')),
      noAccessSearch: shown(
        branchRows(failed('github_access_required'), onMain, 'feature'),
      ),
      empty: shown(
        branchRows(
          ready({
            branches: [],
          }),
          onMain,
          '',
        ),
      ),
    }).toEqual({
      loading: { rows: ['main ✓'], status: { kind: 'loading' } },
      failed: { rows: ['main ✓'], status: { kind: 'failed' } },
      offline: { rows: ['main ✓'], status: { kind: 'failed' } },
      noAccess: { rows: ['main ✓'], status: { kind: 'no-access' } },
      noAccessSearch: { rows: [], status: { kind: 'no-access' } },
      empty: { rows: ['main ✓'], status: null },
    })
  })
})
