import { expect, it } from 'vitest'
import type { WorkspaceBranchesResponse } from '../../shared/workspace-branches'
import { ParseError } from './parse'
import { readWorkspaceBranches } from './read-workspace-branches'

const page: WorkspaceBranchesResponse = {
  rows: [
    {
      type: 'pull-request',
      number: 486,
      title: 'Gift cards at checkout',
      url: 'https://github.com/acme/storefront/pull/486',
      branch: 'priyaraman/gift-cards',
      headRepositoryId: 731402586,
      availability: 'available',
    },
    {
      type: 'pull-request',
      number: 477,
      title: 'Polish translations for checkout',
      url: 'https://github.com/acme/storefront/pull/477',
      branch: 'main',
      headRepositoryId: null,
      availability: 'another-repository',
    },
    { type: 'branch', name: 'calummoore/oslo-3f8k' },
  ],
  nextCursor: 'eyJicmFuY2hlcyI6IjMifQ==',
}

it('keeps every field of a branch, of a pull request of the repository, and of one whose fork is gone, with the cursor of the next page', () => {
  expect({
    page: readWorkspaceBranches(page),
    last: readWorkspaceBranches({ rows: [], nextCursor: null }),
  }).toEqual({ page, last: { rows: [], nextCursor: null } })
})

it('rejects a reply of an unknown shape: a row of another kind, an unknown availability, or no rows', () => {
  const [pullRequest] = page.rows
  const cases = [
    { rows: [{ type: 'tag', name: 'v1.0.0' }], nextCursor: null },
    { rows: [{ ...pullRequest, availability: 'fork' }], nextCursor: null },
    { nextCursor: null },
  ]
  for (const body of cases) {
    expect(() => readWorkspaceBranches(body), JSON.stringify(body)).toThrow(
      ParseError,
    )
  }
})
