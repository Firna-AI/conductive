import { routes } from '../../src/app/router'
import type { AgentPreview } from '../../src/shared/generated/AgentPreview'
import type { Preview } from '../../src/shared/generated/Preview'

/**
 * The app page that shows one preview in the Preview tool of its
 * workspace. The chat opens it inside the app, also in the Mac app, and a
 * signed-out browser gets the sign-in of the app.
 */
function previewLink(
  origin: string,
  orgId: string,
  workspaceId: string,
  previewId: string,
): string {
  return new URL(
    routes.workspace(orgId, workspaceId, 'preview', previewId),
    origin,
  ).href
}

/**
 * A preview as an agent tool reply gives it: with the link of its app
 * page in place of the launch address, which the chat shows as text.
 */
export function agentPreview(
  preview: Preview,
  origin: string,
  orgId: string,
  workspaceId: string,
): AgentPreview {
  return {
    id: preview.id,
    port: preview.port,
    link: previewLink(origin, orgId, workspaceId, preview.id),
    expiresAt: preview.expiresAt,
  }
}
