import { HttpError } from '../http'

export async function readOrgProviderAccount(
  db: D1Database,
  orgId: string,
): Promise<string> {
  const row = await db
    .prepare(
      'SELECT provider_account AS providerAccount FROM orgs WHERE id = ?',
    )
    .bind(orgId)
    .first<{ providerAccount: string }>()
  if (!row)
    throw new HttpError(404, 'org_not_found', 'The org is not available.')
  return row.providerAccount
}
