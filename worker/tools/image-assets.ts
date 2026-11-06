import contractSource from '../../src/shared/agent-tools.ts?raw'
import cliSource from '../../tools/cli.ts?raw'
import clientSource from '../../tools/client.ts?raw'
import contextSource from '../../tools/context.ts?raw'
import type { WorkspaceToolSource } from '../../tools/image-manifest'
import inputSource from '../../tools/input.ts?raw'
import mainSource from '../../tools/main.ts?raw'
import mcpToolsSource from '../../tools/mcp-tools.ts?raw'
import mcpSource from '../../tools/mcp.ts?raw'
import responsesSource from '../../tools/responses.ts?raw'
import runtimeSource from '../../tools/runtime.ts?raw'

/** Vite embeds these allowed sources as text in the Worker bundle. */
export const WORKSPACE_TOOL_SOURCES = [
  { path: 'tools/main.ts', contents: mainSource },
  { path: 'tools/cli.ts', contents: cliSource },
  { path: 'tools/client.ts', contents: clientSource },
  { path: 'tools/context.ts', contents: contextSource },
  { path: 'tools/input.ts', contents: inputSource },
  { path: 'tools/responses.ts', contents: responsesSource },
  { path: 'tools/mcp.ts', contents: mcpSource },
  { path: 'tools/mcp-tools.ts', contents: mcpToolsSource },
  { path: 'tools/runtime.ts', contents: runtimeSource },
  { path: 'src/shared/agent-tools.ts', contents: contractSource },
] as const satisfies readonly WorkspaceToolSource[]
