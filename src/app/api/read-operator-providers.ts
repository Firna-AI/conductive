import type { OperatorProvidersResponse } from '../../shared/operator-providers'
import { count, items, maybeCount, maybeNested, record, text } from './parse'
import { readIdentity } from './read-operator-waitlist'

export function readOperatorProviders(
  value: unknown,
): OperatorProvidersResponse {
  const reply = record(value, 'providers')
  return {
    accounts: items(reply, 'accounts', (value) => {
      const account = record(value, 'account')
      return {
        id: text(account, 'id'),
        weight: count(account, 'weight'),
        orgs: count(account, 'orgs'),
      }
    }),
    updatedAt: maybeCount(reply, 'updatedAt'),
    operator: maybeNested(reply, 'operator', readIdentity),
  }
}
