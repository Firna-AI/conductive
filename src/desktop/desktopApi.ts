import { desktopPath, type DesktopResponse } from '../shared/desktop'
import {
  isRecord,
  requestJson,
  webUrl,
  type ToolResult,
} from '../terminal/tool-parts/request'
import type { ToolRequests } from '../terminal/tool-parts/workspace'

/** Narrows the desktop response. The URL stays as sent, with its fragment. */
function parseDesktopResponse(body: unknown): DesktopResponse | null {
  if (!isRecord(body)) return null
  const url = webUrl(body.url)
  const { expiresAt } = body
  if (url === null || typeof expiresAt !== 'number') return null
  return { url, expiresAt }
}

/**
 * Gets a new desktop URL from the server. The browser cache is skipped, so
 * each load of the tool gets a URL of its own.
 */
export function loadDesktop(
  workspace: ToolRequests,
  signal: AbortSignal,
): Promise<ToolResult<DesktopResponse>> {
  return requestJson(
    workspace.fetch,
    {
      method: 'GET',
      path: desktopPath(workspace.orgId, workspace.workspaceId),
      signal,
      cache: 'no-store',
    },
    parseDesktopResponse,
  )
}
