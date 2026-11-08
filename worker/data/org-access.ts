import { productDomain } from '../../docs/mockups/src/brand'
import { HttpError } from '../http'

type OrgAlias = 'o' | 'orgs' | 'access_org' | 'workspace_org' | 'token_org'

export function activeOrgPredicate(alias: OrgAlias): string {
  return `${alias}.suspended_at IS NULL`
}

export function suspendedOrgError(): HttpError {
  return new HttpError(
    403,
    'org_suspended',
    `This org is suspended. For questions, write to abuse@${productDomain}.`,
  )
}

/** The expression comes only from the caller's static SQL. */
export function activeOrgIdPredicate(expression: string): string {
  return `EXISTS (SELECT 1 FROM orgs access_org WHERE access_org.id = ${expression} AND ${activeOrgPredicate('access_org')})`
}
