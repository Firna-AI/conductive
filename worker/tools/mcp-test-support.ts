import { record } from '../../tools/input'

export const MCP_INITIALIZE = JSON.stringify({
  jsonrpc: '2.0',
  id: 'init',
  method: 'initialize',
  params: {
    protocolVersion: '2099-01-01',
    capabilities: {},
    clientInfo: { name: 'test-agent', version: '1' },
  },
})

export const MCP_INITIALIZED = JSON.stringify({
  jsonrpc: '2.0',
  method: 'notifications/initialized',
})

export const mcpRequest = (
  id: string | number,
  method: string,
  params?: unknown,
) => JSON.stringify({ jsonrpc: '2.0', id, method, params })

export const mcpToolCall = (
  id: string | number,
  name: string,
  args?: unknown,
) => mcpRequest(id, 'tools/call', { name, arguments: args })

export function mcpReplies(lines: readonly string[]) {
  return lines.map((line) => {
    const value: unknown = JSON.parse(line)
    return record(value)
  })
}

export function mcpRepliesById(lines: readonly string[]) {
  return Object.fromEntries(
    mcpReplies(lines).map((reply) => [String(reply.id), reply]),
  )
}
