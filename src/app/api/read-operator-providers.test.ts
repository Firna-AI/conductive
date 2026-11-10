import { expect, it } from 'vitest'

import type { OperatorProvidersResponse } from '../../shared/operator-providers'
import { ParseError } from './parse'
import { readOrgsPage } from './read-operator'
import { readOperatorOrg } from './read-operator-pages'
import { readOperatorProviders } from './read-operator-providers'
import { operatorFixtures, orgRow } from '../../test-support/fixtures/operator'

it('retains provider weights, counts and audit identity, and the account of operator orgs', () => {
  const reply: OperatorProvidersResponse = {
    accounts: [
      { id: 'boat', weight: 25, orgs: 3 },
      { id: 'e2b', weight: 75, orgs: 1 },
    ],
    updatedAt: 1_800_000_000_000,
    operator: { githubId: 7, login: 'operator' },
  }
  expect(readOperatorProviders(reply)).toEqual(reply)
  expect(
    readOperatorProviders({ ...reply, updatedAt: null, operator: null }),
  ).toEqual({ ...reply, updatedAt: null, operator: null })
  const org = { ...operatorFixtures().orgs[0], providerAccount: 'e2b' }
  expect(readOperatorOrg(org).providerAccount).toBe('e2b')
  expect(
    readOrgsPage({ orgs: [orgRow(org)], total: 1, nextCursor: null }).rows[0]
      ?.providerAccount,
  ).toBe('e2b')
  expect(() =>
    readOperatorProviders({
      ...reply,
      accounts: [{ id: 'boat', weight: '25', orgs: 3 }],
    }),
  ).toThrow(ParseError)
})
