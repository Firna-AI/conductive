import { DeviceContractError } from '../src/shared/device-read.ts'
import type { WorkspaceToolClient } from './client.ts'
import { CLI_HELP } from './cli-help.ts'
import { toolHelpRequested } from './cli-options.ts'
import { runMacCli } from './device-cli.ts'
import { ToolInputError } from './input.ts'
import type { MessageInput } from './message-input.ts'
import { runResourceCli } from './resource-cli.ts'
import { runSessionCli } from './session-cli.ts'
import { WorkspaceToolError } from './transport.ts'
import { runWorkspaceCommand } from './workspace-cli.ts'

export interface ToolOutput {
  stdout(text: string): void
  stderr(text: string): void
}

export async function runWorkspaceCli(
  args: readonly string[],
  client: WorkspaceToolClient,
  output: ToolOutput,
  input?: MessageInput,
): Promise<number> {
  if (toolHelpRequested(args)) {
    output.stdout(CLI_HELP)
    return 0
  }
  try {
    if (args[0] === 'mac') return await runMacCli(args, client, output)
    const result =
      args[0] === 'workspaces'
        ? await runWorkspaceCommand(args, client, input)
        : args[0] === 'sessions'
          ? await runSessionCli(args, client, input)
          : await runResourceCli(args, client)
    output.stdout(`${JSON.stringify(result)}\n`)
    return 0
  } catch (error) {
    output.stderr(`${toolErrorMessage(error)}\n`)
    return 1
  }
}

export function toolErrorMessage(error: unknown): string {
  if (error instanceof WorkspaceToolError && error.code)
    return `${error.code}: ${error.message}`
  return error instanceof ToolInputError ||
    error instanceof WorkspaceToolError ||
    error instanceof DeviceContractError
    ? error.message
    : 'The workspace request failed. Try again.'
}
