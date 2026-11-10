import { PREVIEW_RELAY_MARK_HEADER } from '../../src/shared/previews'

export function relayResponse(
  body: BodyInit | null = null,
  init: ResponseInit = {},
): Response {
  const headers = new Headers(init.headers)
  headers.set(PREVIEW_RELAY_MARK_HEADER, '1')
  return new Response(body, { ...init, headers })
}
