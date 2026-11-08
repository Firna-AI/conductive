import { routes } from '../../../app/router'
import type { WorkspaceView } from '../../../shared/workspace-view'

/** A tool of the tools panel, as the workspace view names it. */
export type ToolKey = WorkspaceView['tool']

/** The tool that an address shows, and the preview that it names. */
export interface ToolPlace {
  tool: ToolKey
  previewId: string | null
}

/** The tools in the order of their tabs, with their labels. */
export const toolTabs: readonly { tool: ToolKey; label: string }[] = [
  { tool: 'terminal', label: 'Terminal' },
  { tool: 'preview', label: 'Preview' },
  { tool: 'desktop', label: 'Desktop' },
]

/**
 * The tool of the address after the workspace, or null for the chat, the
 * files, or another address: `terminal`, `preview`, `preview/<previewId>`,
 * or `desktop`.
 */
export function toolPlace(view: readonly string[]): ToolPlace | null {
  const [area, previewId, ...rest] = view
  if (area === 'terminal' || area === 'desktop') {
    return { tool: area, previewId: null }
  }
  if (area !== 'preview') return null
  return {
    tool: 'preview',
    previewId: previewId !== undefined && rest.length === 0 ? previewId : null,
  }
}

/** The address of a tool, or of one preview of the Preview tool. */
export function toolHref(
  orgId: string,
  workspaceId: string,
  tool: ToolKey,
  previewId?: string,
): string {
  return previewId === undefined
    ? routes.workspace(orgId, workspaceId, tool)
    : routes.workspace(orgId, workspaceId, tool, previewId)
}
