import { routes } from '../../../app/router'
import type { WorkspaceView } from '../../../shared/workspace-view'

/** A tool of the tools panel, as the workspace view names it. */
export type ToolKey = WorkspaceView['tool']

/**
 * The tool that an address shows, and the preview or the port of the sandbox
 * that it names. An address names a preview or a port, never both.
 */
export interface ToolPlace {
  tool: ToolKey
  previewId: string | null
  /** A port of the sandbox, which the Preview tool opens. */
  port: number | null
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
 * The segment before the port in the address of the Preview tool with a
 * port. A preview ID with a segment after it names no preview, so no older
 * address changes its meaning.
 */
const portSegment = 'port'

/**
 * The port of an address: a whole number from 1 to 65535, with no sign and
 * no leading zero, as the builder writes it. Another value is null.
 */
function addressPort(segment: string): number | null {
  if (!/^[1-9]\d{0,4}$/.test(segment)) return null
  const port = Number(segment)
  return port <= 65535 ? port : null
}

/**
 * The tool of the address after the workspace, or null for the chat, the
 * files, or another address: `terminal`, `preview`, `preview/<previewId>`,
 * `preview/port/<port>`, or `desktop`. Another address under `preview`
 * shows the Preview tool with no preview and no port.
 */
export function toolPlace(view: readonly string[]): ToolPlace | null {
  const [area, second, third, ...rest] = view
  if (area === 'terminal' || area === 'desktop') {
    return { tool: area, previewId: null, port: null }
  }
  if (area !== 'preview') return null
  if (second === portSegment && third !== undefined && rest.length === 0) {
    return { tool: 'preview', previewId: null, port: addressPort(third) }
  }
  return {
    tool: 'preview',
    previewId: second !== undefined && third === undefined ? second : null,
    port: null,
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

/**
 * The address of the Preview tool with a port of the sandbox, such as for
 * a local address in chat text. The tool shows the open preview of the
 * port, or opens one, then puts the address of that preview in its place.
 */
export function previewPortHref(
  orgId: string,
  workspaceId: string,
  port: number,
): string {
  return routes.workspace(
    orgId,
    workspaceId,
    'preview',
    portSegment,
    String(port),
  )
}
