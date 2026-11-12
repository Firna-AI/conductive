import { MAC_MCP_TOOL, METADATA_MCP_TOOLS } from './metadata-mcp-tools.ts'
import { RESOURCE_MCP_TOOLS } from './resource-mcp-tools.ts'
import { SESSION_MCP_TOOLS } from './session-mcp-tools.ts'
import { WORKSPACE_CALLS } from './workspace-mcp-tools.ts'

export const WORKSPACE_MCP_TOOLS = [
  MAC_MCP_TOOL,
  ...WORKSPACE_CALLS,
  ...METADATA_MCP_TOOLS,
  ...SESSION_MCP_TOOLS,
  ...RESOURCE_MCP_TOOLS,
] as const
