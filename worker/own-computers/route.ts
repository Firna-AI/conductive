import { COMPUTER_PATH } from '../../src/shared/computer'
import type { ComputerEnrollment } from '../../src/shared/generated/ComputerEnrollment'
import type { AppEnv } from '../env'
import { hash, randomToken } from '../security/crypto'
import {
  computerEnrollmentCode,
  computerWebSocketToken,
  credentialRequired,
} from './authorization'
import { computerIdByCode, consumeComputerCode } from './code-data'
import { computerNamespace, computerObjectId } from './identity'

export async function routeComputer(
  request: Request,
  env: AppEnv,
  now: () => number,
): Promise<Response | null> {
  if (new URL(request.url).pathname !== COMPUTER_PATH) return null
  if (request.method === 'POST' && !request.headers.has('Upgrade'))
    return enroll(request, env, now)

  const { objectId } = computerWebSocketToken(request)
  const namespace = computerNamespace(env)
  let id: DurableObjectId
  try {
    id = namespace.idFromString(objectId)
  } catch {
    throw credentialRequired()
  }
  const response = await namespace.get(id).fetch(request)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    ...(response.webSocket && { webSocket: response.webSocket }),
  })
}

async function enroll(request: Request, env: AppEnv, now: () => number) {
  const code = computerEnrollmentCode(request)
  const digest = await hash(code)
  const computerId = await computerIdByCode(env.DB, digest)
  if (!computerId) throw credentialRequired()
  const id = computerObjectId(computerNamespace(env), computerId)
  const computerToken = `cndc1.${id.toString()}.${randomToken()}`
  const tokenDigest = await hash(computerToken)
  if (
    !(await consumeComputerCode(env.DB, computerId, digest, tokenDigest, now()))
  )
    throw credentialRequired()
  return Response.json({ computerToken } satisfies ComputerEnrollment)
}
