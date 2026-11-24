import type { Preview } from './generated/Preview'
import type { Timestamp } from './generated/Timestamp'
import { workspacePath } from './workspaces'

export const PREVIEW_RELAY_PORT = 7682
export const PREVIEW_RELAY_PORT_HEADER = 'X-Conductive-Preview-Port'
export const PREVIEW_RELAY_MARK_HEADER = 'X-Conductive-Relay'
/** The loopback port of the file server of the runner, which serves the files preview. */
export const PREVIEW_FILE_SERVER_PORT = 7683
/** The Worker adds this header, the files mark, only to the requests of a files preview. */
export const PREVIEW_FILES_MARK_HEADER = 'X-Conductive-Files'
/** The Worker adds this header, with the origin of the files preview, to the same requests as the files mark. */
export const PREVIEW_FILES_ORIGIN_HEADER = 'X-Conductive-Files-Origin'
/** The error code of an open of the files preview whose runner announced no file server. */
export const FILE_SERVER_UNAVAILABLE = 'file_server_unavailable'

export function previewsPath(orgId: string, workspaceId: string): string {
  return `${workspacePath(orgId, workspaceId)}/previews`
}
export function previewPath(
  orgId: string,
  workspaceId: string,
  previewId: string,
): string {
  return `${previewsPath(orgId, workspaceId)}/${encodeURIComponent(previewId)}`
}
/** The route that opens the files preview of a workspace, or returns the active one. */
export function filesPreviewPath(orgId: string, workspaceId: string): string {
  return `${previewsPath(orgId, workspaceId)}/files`
}
/** The launch address of a preview, at the path of a file when one is given. */
export function previewLaunchUrl(preview: Preview, path?: string): string {
  if (path === undefined) return preview.url
  const url = new URL(preview.url)
  url.searchParams.set('path', path)
  return url.href
}
export interface PreviewResponse {
  preview: Preview
}
export interface PreviewsResponse {
  previews: readonly Preview[]
}

/** Native-only launcher reply. The short preview grant appears only in the URL fragment. */
export interface PreviewLaunchResponse {
  url: string
  expiresAt: Timestamp
}
