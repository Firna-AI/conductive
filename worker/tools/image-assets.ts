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
import deviceClientSource from '../../tools/device-client.ts?raw'
import deviceCliSource from '../../tools/device-cli.ts?raw'
import deviceSource from '../../src/shared/device.ts?raw'
import deviceReadSource from '../../src/shared/device-read.ts?raw'
import githubReadSource from '../../src/shared/github-read.ts?raw'
import sessionCliSource from '../../tools/session-cli.ts?raw'
import sessionResponsesSource from '../../tools/session-responses.ts?raw'
import sessionMcpToolsSource from '../../tools/session-mcp-tools.ts?raw'

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
  { path: 'tools/device-client.ts', contents: deviceClientSource },
  { path: 'tools/device-cli.ts', contents: deviceCliSource },
  { path: 'tools/session-cli.ts', contents: sessionCliSource },
  { path: 'tools/session-responses.ts', contents: sessionResponsesSource },
  { path: 'tools/session-mcp-tools.ts', contents: sessionMcpToolsSource },
  { path: 'src/shared/device.ts', contents: deviceSource },
  { path: 'src/shared/device-read.ts', contents: deviceReadSource },
  { path: 'src/shared/github-read.ts', contents: githubReadSource },
  { path: 'src/shared/agent-tools.ts', contents: contractSource },
] as const satisfies readonly WorkspaceToolSource[]
