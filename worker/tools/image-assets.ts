import workspaceContractSource from '../../src/shared/agent-workspaces.ts?raw'
import sessionPathsSource from '../../src/shared/agent-session-paths.ts?raw'
import sessionContractSource from '../../src/shared/agent-sessions.ts?raw'
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

import transportSource from '../../tools/transport.ts?raw'
import querySource from '../../tools/query.ts?raw'
import listInputSource from '../../tools/list-input.ts?raw'
import workspaceClientSource from '../../tools/workspace-client.ts?raw'
import sessionClientSource from '../../tools/session-client.ts?raw'
import resourceClientSource from '../../tools/resource-client.ts?raw'
import sessionWriteResponsesSource from '../../tools/session-write-responses.ts?raw'
import resourceResponsesSource from '../../tools/resource-responses.ts?raw'
import cliHelpSource from '../../tools/cli-help.ts?raw'
import cliOptionsSource from '../../tools/cli-options.ts?raw'
import messageInputSource from '../../tools/message-input.ts?raw'
import workspaceCliSource from '../../tools/workspace-cli.ts?raw'
import resourceCliSource from '../../tools/resource-cli.ts?raw'
import mcpSchemaSource from '../../tools/mcp-schema.ts?raw'
import workspaceMcpToolsSource from '../../tools/workspace-mcp-tools.ts?raw'
import resourceMcpToolsSource from '../../tools/resource-mcp-tools.ts?raw'
import metadataMcpToolsSource from '../../tools/metadata-mcp-tools.ts?raw'
import mcpDispatchSource from '../../tools/mcp-dispatch.ts?raw'
import sectionContractSource from '../../src/shared/agent-sections.ts?raw'
import previewContractSource from '../../src/shared/agent-previews.ts?raw'

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
  { path: 'src/shared/agent-session-paths.ts', contents: sessionPathsSource },
  { path: 'src/shared/agent-sessions.ts', contents: sessionContractSource },
  { path: 'src/shared/agent-workspaces.ts', contents: workspaceContractSource },
  { path: 'tools/transport.ts', contents: transportSource },
  { path: 'tools/query.ts', contents: querySource },
  { path: 'tools/list-input.ts', contents: listInputSource },
  { path: 'tools/workspace-client.ts', contents: workspaceClientSource },
  { path: 'tools/session-client.ts', contents: sessionClientSource },
  { path: 'tools/resource-client.ts', contents: resourceClientSource },
  {
    path: 'tools/session-write-responses.ts',
    contents: sessionWriteResponsesSource,
  },
  { path: 'tools/resource-responses.ts', contents: resourceResponsesSource },
  { path: 'tools/cli-help.ts', contents: cliHelpSource },
  { path: 'tools/cli-options.ts', contents: cliOptionsSource },
  { path: 'tools/message-input.ts', contents: messageInputSource },
  { path: 'tools/workspace-cli.ts', contents: workspaceCliSource },
  { path: 'tools/resource-cli.ts', contents: resourceCliSource },
  { path: 'tools/mcp-schema.ts', contents: mcpSchemaSource },
  { path: 'tools/workspace-mcp-tools.ts', contents: workspaceMcpToolsSource },
  { path: 'tools/resource-mcp-tools.ts', contents: resourceMcpToolsSource },
  { path: 'tools/metadata-mcp-tools.ts', contents: metadataMcpToolsSource },
  { path: 'tools/mcp-dispatch.ts', contents: mcpDispatchSource },
  { path: 'src/shared/agent-sections.ts', contents: sectionContractSource },
  { path: 'src/shared/agent-previews.ts', contents: previewContractSource },
] as const satisfies readonly WorkspaceToolSource[]
