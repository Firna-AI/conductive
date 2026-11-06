import process from 'node:process'
import { createInterface } from 'node:readline'
import { pathToFileURL } from 'node:url'

import { CLI_HELP, runWorkspaceCli, toolErrorMessage } from './cli.ts'
import { createWorkspaceToolClient } from './client.ts'
import { createWorkspaceMcp } from './mcp.ts'
import { runtimeConfiguration } from './runtime.ts'

export async function runToolProcess(
  args: readonly string[],
  environment: Readonly<Record<string, string | undefined>>,
  input: AsyncIterable<string>,
  output: { stdout(text: string): void; stderr(text: string): void },
  send?: (request: Request) => Promise<Response>,
): Promise<number> {
  if (args.length === 0 || args.includes('--help')) {
    output.stdout(CLI_HELP)
    return 0
  }
  try {
    const client = createWorkspaceToolClient(
      runtimeConfiguration(environment),
      send,
    )
    if (args.length !== 1 || args[0] !== 'mcp') {
      return runWorkspaceCli(args, client, output)
    }
    const server = createWorkspaceMcp(client)
    for await (const line of input) {
      const response = await server.line(line)
      if (response) output.stdout(`${JSON.stringify(response)}\n`)
    }
    return 0
  } catch (error) {
    output.stderr(`${toolErrorMessage(error)}\n`)
    return 1
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const lines = createInterface({ input: process.stdin, crlfDelay: Infinity })
  try {
    process.exitCode = await runToolProcess(
      process.argv.slice(2),
      process.env,
      lines,
      {
        stdout: (text) => {
          process.stdout.write(text)
        },
        stderr: (text) => {
          process.stderr.write(text)
        },
      },
    )
  } finally {
    lines.close()
  }
}
