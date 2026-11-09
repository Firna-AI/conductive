import { routes } from '../../../app/router'
import type { WorkspaceView } from '../../../shared/workspace-view'

/** A tool of the tools panel, as the workspace view names it. */
export type ToolKey = WorkspaceView['tool']

/** The tool that an address shows, and the preview that it names. */
export interface ToolPlace {
  tool: ToolKey
  previewId: string | null
}

/**
 * The tools that the app offers to every user. The app hides Desktop for
 * now and keeps its code for its return, as
 * docs/protocol/workspace-tools.md#desktop says. A hidden tool keeps its
 * key, so an address or a saved view that names it stays valid.
 */
const offeredTools: ReadonlySet<ToolKey> = new Set(['terminal', 'preview'])

/** Whether the app offers a tool: its tab, its phone page, and its Go to row. */
export function toolOffered(tool: ToolKey): boolean {
  return offeredTools.has(tool)
}

/**
 * The tool that shows when an address or the saved view names `tool`. A
 * hidden tool shows Terminal, and the saved view keeps its name.
 */
export function shownTool(tool: ToolKey): ToolKey {
  return toolOffered(tool) ? tool : 'terminal'
}

/** The tools in the order of their tabs, with their labels. */
const toolTabs: readonly { tool: ToolKey; label: string }[] = [
  { tool: 'terminal', label: 'Terminal' },
  { tool: 'preview', label: 'Preview' },
  { tool: 'desktop', label: 'Desktop' },
]

/** The tabs of the tools that the app offers, in their order. */
export const offeredToolTabs = toolTabs.filter((tab) => toolOffered(tab.tool))

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
