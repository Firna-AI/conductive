export const WORKSPACE_TOOL_SOURCE_PATHS = [
  'tools/main.ts',
  'tools/cli.ts',
  'tools/client.ts',
  'tools/context.ts',
  'tools/input.ts',
  'tools/responses.ts',
  'tools/mcp.ts',
  'tools/mcp-tools.ts',
  'tools/runtime.ts',
  'tools/device-client.ts',
  'tools/device-cli.ts',
  'tools/session-cli.ts',
  'tools/session-responses.ts',
  'tools/session-mcp-tools.ts',
  'src/shared/device.ts',
  'src/shared/device-read.ts',
  'src/shared/agent-tools.ts',
] as const

export interface WorkspaceToolSource {
  path: (typeof WORKSPACE_TOOL_SOURCE_PATHS)[number]
  contents: string
}
