import { parseArgs } from 'node:util'

import { WorkspaceToolError, type WorkspaceToolClient } from './client.ts'
import { createWorkspaceInput, ToolInputError } from './input.ts'
import { DeviceContractError } from '../src/shared/device-read.ts'
import { runMacCli } from './device-cli.ts'

export const CLI_HELP = `Conductive workspace tools

conductive workspaces list
conductive workspaces create --repository ID --message TEXT
  [--agent claude|codex --model NAME] [--effort LEVEL] [--section ID]
conductive mcp
conductive mac run --command TEXT --folder PATH --reason TEXT
  [--timeout-seconds SECONDS] [--longer-timeout-reason TEXT] [--request-id ID]

Create starts a workspace in the calling workspace's org, with its owner.
Omitted options use the owner's model and effort, and the default section.
List returns every workspace in the org, with its number and web link.
A workspace link in a message names that workspace.
A workspace link in an answer shows as a chip.
`

export interface ToolOutput {
  stdout(text: string): void
  stderr(text: string): void
}

export async function runWorkspaceCli(
  args: readonly string[],
  client: WorkspaceToolClient,
  output: ToolOutput,
): Promise<number> {
  if (args.length === 0 || args.includes('--help')) {
    output.stdout(CLI_HELP)
    return 0
  }
  try {
    if (args[0] === 'mac') return await runMacCli(args, client, output)
    const { values, positionals } = parseArguments(args)
    if (positionals[0] !== 'workspaces' || positionals.length !== 2) {
      throw new ToolInputError('Use workspaces create or workspaces list.')
    }
    let result: unknown
    if (positionals[1] === 'list') {
      if (Object.values(values).some((value) => value !== undefined)) {
        throw new ToolInputError('Use workspaces list without options.')
      }
      result = await client.list()
    } else if (positionals[1] === 'create') {
      const hasModel = values.agent !== undefined || values.model !== undefined
      result = await client.create(
        createWorkspaceInput({
          repositoryId: values.repository,
          firstMessage: values.message,
          ...(hasModel && {
            model: { agent: values.agent, model: values.model },
          }),
          effort: values.effort,
          sectionId: values.section,
        }),
      )
    } else {
      throw new ToolInputError('Use workspaces create or workspaces list.')
    }
    output.stdout(`${JSON.stringify(result)}\n`)
    return 0
  } catch (error) {
    output.stderr(`${toolErrorMessage(error)}\n`)
    return 1
  }
}

function parseArguments(args: readonly string[]) {
  try {
    return parseArgs({
      args: [...args],
      allowPositionals: true,
      options: {
        repository: { type: 'string' },
        message: { type: 'string' },
        agent: { type: 'string' },
        model: { type: 'string' },
        effort: { type: 'string' },
        section: { type: 'string' },
      },
    })
  } catch {
    throw new ToolInputError(
      'Check the command options. Use --help for details.',
    )
  }
}

export function toolErrorMessage(error: unknown): string {
  return error instanceof ToolInputError ||
    error instanceof WorkspaceToolError ||
    error instanceof DeviceContractError
    ? error.message
    : 'The workspace request failed. Try again.'
}
