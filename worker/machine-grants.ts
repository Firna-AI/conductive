import type { AppEnv } from './env'
import {
  ATTACHMENT_DOWNLOAD_PATH,
  handleAttachmentDownload,
} from './chat/attachment-download'
import {
  IMAGE_SOURCE_CREDENTIAL_PATH,
  handleImageSourceCredential,
} from './lifecycle/image-sources/credential'

export function routeMachineGrant(
  request: Request,
  env: AppEnv,
): Promise<Response> | null {
  const path = new URL(request.url).pathname
  if (path === ATTACHMENT_DOWNLOAD_PATH)
    return handleAttachmentDownload(request, env)
  if (path === IMAGE_SOURCE_CREDENTIAL_PATH)
    return handleImageSourceCredential(request, env)
  return null
}
