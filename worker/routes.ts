import { API_PATHS, boatKeyPath, orgPath } from '../src/shared/api'
import { boatKeyStatus } from './data/boat-keys'
import { createOrg, listOrgs } from './data/orgs'
import type { AppDependencies, AppEnv } from './env'
import { HttpError, requiredString } from './http'
import { storeBoatKey } from './sandbox/keys'
import { signOut } from './security/auth'
import type { RequestContext } from './security/gate'

export async function route(
  request: Request,
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
): Promise<Response> {
  const path = new URL(request.url).pathname
  if (path === API_PATHS.session && request.method === 'GET') {
    return Response.json({ user: context.user })
  }
  if (path === API_PATHS.signOut && request.method === 'POST') {
    return signOut(env, context.sessionId)
  }
  if (path === API_PATHS.orgs) {
    if (request.method === 'GET') {
      return Response.json({ orgs: await listOrgs(env.DB, context.user.id) })
    }
    if (request.method === 'POST') {
      const org = await createOrg(
        env.DB,
        dependencies.randomToken(),
        requiredString(context.body?.name),
        context.user.id,
        dependencies.now(),
      )
      return Response.json({ org }, { status: 201 })
    }
  }
  if (context.org) {
    if (path === orgPath(context.org.id) && request.method === 'GET') {
      return Response.json({ org: context.org })
    }
    if (path === boatKeyPath(context.org.id)) {
      if (request.method === 'GET') {
        return Response.json(await boatKeyStatus(env.DB, context.org.id))
      }
      if (request.method === 'PUT') {
        return Response.json(
          await storeBoatKey(
            env,
            context.org.id,
            requiredString(context.body?.key),
            dependencies.fetch,
            dependencies.now(),
          ),
        )
      }
    }
  }
  throw new HttpError(404, 'not_found', 'The page is not available.')
}
