import type { AppEnv } from '../env'
import { rawUploadRoute } from '../http/raw-upload-routes'
import { randomToken } from '../security/crypto'
import { attachmentMultipartRoute } from './attachment-multipart-routes'
import { attachmentPartRoute } from './attachment-part-route'

export async function attachmentRoute(
  request: Request,
  env: AppEnv,
  now: () => number,
  newId: () => string = randomToken,
): Promise<Response | null> {
  const multipart = await attachmentMultipartRoute(request, env, now, newId)
  if (multipart) return multipart
  const route = rawUploadRoute(request)
  if (!route) return null
  return attachmentPartRoute(request, env, route, now)
}
