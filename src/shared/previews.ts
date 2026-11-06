import type { Timestamp } from './api'
import { workspacePath } from './workspaces'

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
export interface OpenPreviewRequest {
  port: number
}
export interface Preview {
  /** New for each open. The API never gives out a revoked ID again. */
  id: string
  port: number
  /** An opaque credential on a separate registrable domain. */
  url: string
  expiresAt: Timestamp
}
export interface PreviewResponse {
  preview: Preview
}
export interface PreviewsResponse {
  previews: readonly Preview[]
}
