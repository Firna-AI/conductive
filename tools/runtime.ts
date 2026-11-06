import type { WorkspaceToolConfiguration } from './client.ts'
import { TOOL_ENV } from './context.ts'
import { ToolInputError } from './input.ts'

export function runtimeConfiguration(
  environment: Readonly<Record<string, string | undefined>>,
): WorkspaceToolConfiguration {
  const machineOrigin = environment[TOOL_ENV.machineOrigin]
  const workspaceToken = environment[TOOL_ENV.workspaceToken]
  const turnId = environment[TOOL_ENV.turnId]
  if (!machineOrigin || !workspaceToken) {
    throw new ToolInputError('Start the workspace before you use its tools.')
  }
  try {
    const url = new URL(machineOrigin)
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    ) {
      throw new Error('Invalid machine origin')
    }
  } catch {
    throw new ToolInputError(
      'The workspace tools need a valid machine address.',
    )
  }
  return { machineOrigin, workspaceToken, ...(turnId && { turnId }) }
}
