import { deviceObject, deviceRequired } from '../../src/shared/device-read'
import type { AppEnv } from '../env'
import { HttpError } from '../http'
import { readJsonObject } from '../http/json-body'
import { readBoundedJson } from '../http/bounded-body'
import { DEVICE_INTERNAL_PATH } from './paths'
import { createDeviceProof, verifyDeviceProof } from './proof'

const PROOF_HEADER = 'X-Conductive-Device-Proof'
// A reply can include the accepted request and a full device failure message.
const INTERNAL_REPLY_BYTES = 3_000_000
export function deviceStub(env: AppEnv, name: string) {
  if (!env.WORKSPACES)
    throw new HttpError(503, 'device_unavailable', 'The Mac is not available.')
  return env.WORKSPACES.get(env.WORKSPACES.idFromName(name))
}
/** Fetched response headers are immutable. Preserve socket upgrades when copying. */
export function deviceResponse(response: Response): Response {
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    ...(response.webSocket && { webSocket: response.webSocket }),
  })
}
export async function deviceCall(
  env: AppEnv,
  target: string,
  operation: Record<string, unknown>,
): Promise<unknown> {
  const body = JSON.stringify({ target, operation })
  const proof = await createDeviceProof(target, body, env.SESSION_SIGNING_KEY)
  const response = await deviceStub(env, target).fetch(
    new Request(env.APP_ORIGIN + DEVICE_INTERNAL_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', [PROOF_HEADER]: proof },
      body,
    }),
  )
  if (!response.ok)
    throw new HttpError(
      response.status,
      'device_unavailable',
      'The Mac is not available.',
    )
  return readBoundedJson(response.body, INTERNAL_REPLY_BYTES)
}
export async function deviceInternal(
  request: Request,
  env: AppEnv,
  matches: (name: string) => boolean,
) {
  if (
    request.method !== 'POST' ||
    new URL(request.url).origin !== env.APP_ORIGIN
  )
    throw new HttpError(
      403,
      'device_forbidden',
      'The Mac request is not available.',
    )
  const body = await readJsonObject(request)
  const target = deviceRequired(body.target)
  if (
    !(await verifyDeviceProof(
      request.headers.get(PROOF_HEADER) ?? '',
      target,
      JSON.stringify(body),
      env.SESSION_SIGNING_KEY,
    )) ||
    !matches(target)
  )
    throw new HttpError(
      403,
      'device_forbidden',
      'The Mac request is not available.',
    )
  return { target, operation: deviceObject(body.operation) }
}
