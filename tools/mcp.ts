import type { WorkspaceToolClient } from './client.ts'
import { toolErrorMessage } from './cli.ts'
import {
  createWorkspaceInput,
  isRecord,
  record,
  ToolInputError,
} from './input.ts'
import { WORKSPACE_MCP_TOOLS } from './mcp-tools.ts'
import { readDeviceCommandInput } from '../src/shared/device-read.ts'

/** A fixed supported revision is negotiated, rather than echoing any revision. */
export const MCP_PROTOCOL_VERSION = '2025-11-25'
const serverInfo = { name: 'conducting-workspaces', version: '1.0.0' }

export interface McpResponse {
  jsonrpc: '2.0'
  id: string | number | null
  result?: unknown
  error?: { code: number; message: string }
}

function rpcError(
  id: string | number | null,
  code: number,
  message: string,
): McpResponse {
  return { jsonrpc: '2.0', id, error: { code, message } }
}

export function createWorkspaceMcp(client: WorkspaceToolClient) {
  let initialized = false
  let ready = false

  const handle = async (message: unknown): Promise<McpResponse | null> => {
    let fields: Record<string, unknown>
    try {
      fields = record(message)
    } catch {
      return rpcError(null, -32600, 'Invalid JSON-RPC request.')
    }
    const id =
      typeof fields.id === 'string' ||
      (typeof fields.id === 'number' && Number.isInteger(fields.id))
        ? fields.id
        : null
    if (
      fields.jsonrpc !== '2.0' ||
      typeof fields.method !== 'string' ||
      (fields.id !== undefined && id === null)
    ) {
      return rpcError(id, -32600, 'Invalid JSON-RPC request.')
    }
    // Notifications never produce a reply or invoke a workspace tool.
    if (fields.id === undefined) {
      if (fields.method === 'notifications/initialized' && initialized)
        ready = true
      return null
    }
    if (fields.params !== undefined && !isRecord(fields.params)) {
      return rpcError(id, -32602, 'Invalid request parameters.')
    }
    const success = (result: unknown): McpResponse => ({
      jsonrpc: '2.0',
      id,
      result,
    })
    try {
      if (fields.method === 'initialize') {
        const params = record(fields.params)
        const info = record(params.clientInfo)
        record(params.capabilities)
        if (
          typeof params.protocolVersion !== 'string' ||
          typeof info.name !== 'string' ||
          typeof info.version !== 'string'
        ) {
          throw new ToolInputError('Invalid initialization parameters.')
        }
        initialized = true
        ready = false
        return success({
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo,
        })
      }
      if (fields.method === 'ping') return success({})
      if (!ready)
        return rpcError(id, -32600, 'Initialize the workspace tools first.')
      if (fields.method === 'tools/list') {
        return success({ tools: WORKSPACE_MCP_TOOLS })
      }
      if (fields.method !== 'tools/call') {
        return rpcError(id, -32601, 'Method not found.')
      }
      const params = record(fields.params)
      if (typeof params.name !== 'string') {
        return rpcError(id, -32602, 'Choose a workspace tool.')
      }
      if (!WORKSPACE_MCP_TOOLS.some((tool) => tool.name === params.name)) {
        return rpcError(id, -32602, 'Unknown workspace tool.')
      }
      const args =
        params.arguments === undefined ? {} : record(params.arguments)
      try {
        const result =
          params.name === 'run_mac_command'
            ? await client.runMacCommand(
                readDeviceCommandInput({
                  ...args,
                  requestId: args.requestId ?? crypto.randomUUID(),
                }),
              )
            : params.name === 'create_workspace'
              ? await client.create(createWorkspaceInput(args))
              : await client.list()
        return success({
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result,
          isError: 'request' in result && result.request.state !== 'completed',
        })
      } catch (error) {
        return success({
          content: [{ type: 'text', text: toolErrorMessage(error) }],
          isError: true,
        })
      }
    } catch (error) {
      return rpcError(
        id,
        error instanceof ToolInputError ? -32602 : -32603,
        error instanceof ToolInputError
          ? 'Invalid request parameters.'
          : 'The request failed.',
      )
    }
  }

  return {
    handle,
    async line(line: string): Promise<McpResponse | null> {
      let value: unknown
      try {
        value = JSON.parse(line)
      } catch {
        return rpcError(null, -32700, 'Invalid JSON.')
      }
      return handle(value)
    },
  }
}
