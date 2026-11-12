import { TOOL_ENV } from '../../tools/context'
import { runToolProcess } from '../../tools/main'
import { OUTER_MACHINE_ORIGIN } from '../chat/integration/outer-runtime.test-support'
import { OUTER_TOKEN } from '../chat/integration/outer-seed.test-support'
import { agentWriteFixture } from '../features/agent-session-writes.test-support'
import { inputLines, toolOutput } from './test-support'
import {
  MCP_INITIALIZE,
  MCP_INITIALIZED,
  mcpToolCall,
} from './mcp-test-support'

export async function sessionToolFixture(bundle: string) {
  const active = await agentWriteFixture(bundle)
  const requests: Request[] = []
  const invoke = async (
    args: readonly string[],
    lines: readonly string[],
    withTurn: boolean,
  ) => {
    const output = toolOutput()
    const status = await runToolProcess(
      args,
      {
        [TOOL_ENV.machineOrigin]: OUTER_MACHINE_ORIGIN,
        [TOOL_ENV.workspaceToken]: OUTER_TOKEN,
        ...(withTurn && { [TOOL_ENV.turnId]: active.sourceTurnId }),
      },
      inputLines(lines),
      output.output,
      async (request) => {
        requests.push(request.clone())
        const response = await active.runtime.dispatchFetch(request.url, {
          method: request.method,
          headers: Object.fromEntries(request.headers),
          ...(request.method !== 'GET' && { body: await request.text() }),
        })
        return new Response(await response.text(), {
          status: response.status,
          headers: Object.fromEntries(response.headers),
        })
      },
    )
    return { ...output, status }
  }
  return {
    ...active,
    requests,
    cli: (args: readonly string[], withTurn = true) =>
      invoke(['sessions', ...args], [], withTurn),
    mcp: (name: string, args: unknown = {}, withTurn = true) =>
      invoke(
        ['mcp'],
        [MCP_INITIALIZE, MCP_INITIALIZED, mcpToolCall('call', name, args)],
        withTurn,
      ),
  }
}

export type SessionToolFixture = Awaited<ReturnType<typeof sessionToolFixture>>
