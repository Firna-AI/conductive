import { API_PATHS } from '../../src/shared/api'
import { PENDING_ORG_INVITES_PATH } from '../../src/shared/members'
import { WAITLIST_PATHS } from '../../src/shared/waitlist'
import { HttpError } from '../http'
import { hasAppAccess } from '../waitlist/data'

/** Every other method, path, and upgrade needs app access by default. */
export async function requireAppAccess(
  request: Request,
  db: D1Database,
  userId: string,
): Promise<void> {
  if (await hasAppAccess(db, userId)) return
  const path = new URL(request.url).pathname
  const allowed =
    !request.headers.has('Upgrade') &&
    ((request.method === 'GET' &&
      [
        API_PATHS.session,
        WAITLIST_PATHS.state,
        PENDING_ORG_INVITES_PATH,
      ].includes(path)) ||
      (request.method === 'POST' &&
        (path === API_PATHS.signOut ||
          path === WAITLIST_PATHS.useCode ||
          new RegExp(`^${PENDING_ORG_INVITES_PATH}/[^/]+/accept$`).test(path))))
  if (!allowed)
    throw new HttpError(
      403,
      'access_required',
      'Your account is on the waitlist. Use an invite code to get access.',
    )
}
