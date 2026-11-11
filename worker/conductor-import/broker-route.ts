import { readImportAction } from '../../src/shared/conductor-import-operation-read.ts'
import type { DeviceBroker } from '../devices/broker'
import type { RequestContext } from '../security/gate'
import { HttpError } from '../http'
import { readJsonObject } from '../http/json-body'

export async function importBrokerRoute(
  broker: DeviceBroker,
  request: Request,
  context: RequestContext,
): Promise<Response | null> {
  const match = new URL(request.url).pathname.match(
    /^\/api\/orgs\/([^/]+)\/conductor-import\/operations$/,
  )
  if (!match) return null
  if (request.method !== 'POST')
    throw new HttpError(
      405,
      'method_not_allowed',
      'Use POST to start an import operation.',
    )
  const body = await readJsonObject(request)
  const connection = broker.requirePairing(
    body,
    context.user.id,
    context.sessionId,
  )
  const orgId = decodeURIComponent(match[1])
  return broker.imports.start(
    { orgId, userId: context.user.id, sessionId: context.sessionId },
    connection,
    readImportAction(body),
    request.signal,
  )
}
