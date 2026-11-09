import { HttpError } from '../http'
import { numericGitHubId } from './directory'
import { readOperatorOrg } from './org-detail'
import { readOperatorOrgs } from './org-directory'
import { readOperatorUser } from './user-detail'
import { readOperatorUsers } from './user-directory'

export async function operatorDirectoryRoute(
  db: D1Database,
  url: URL,
  kind: 'orgs' | 'users',
  encodedId: string | undefined,
): Promise<Response> {
  if (encodedId === undefined)
    return Response.json(
      await (kind === 'orgs'
        ? readOperatorOrgs(db, url.searchParams)
        : readOperatorUsers(db, url.searchParams)),
    )
  const missing = () =>
    new HttpError(
      404,
      kind === 'orgs' ? 'org_not_found' : 'user_not_found',
      kind === 'orgs'
        ? 'The org is not available.'
        : 'The account is not available.',
    )
  let id: string
  try {
    id = decodeURIComponent(encodedId)
  } catch {
    throw missing()
  }
  if (kind === 'orgs') return Response.json(await readOperatorOrg(db, id))
  const githubId = numericGitHubId(id)
  if (githubId === null) throw missing()
  return Response.json(await readOperatorUser(db, githubId))
}
