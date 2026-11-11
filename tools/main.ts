import process from 'node:process'
import { createInterface } from 'node:readline'
import { pathToFileURL } from 'node:url'

import {
  CLI_HELP,
  runWorkspaceCli,
  toolErrorMessage,
  toolHelpRequested,
} from './cli.ts'
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
  if (toolHelpRequested(args)) {
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
    const pending = new Set<Promise<void>>()
    let failed = false
    try {
      for await (const line of input) {
        // Each call starts in input order, so initialization stays ordered.
        const task: Promise<void> = server
          .line(line)
          .then((response) => {
            if (response) output.stdout(`${JSON.stringify(response)}\n`)
          })
          .then(
            () => {
              pending.delete(task)
            },
            (error: unknown) => {
              pending.delete(task)
              failed = true
              try {
                output.stderr(`${toolErrorMessage(error)}\n`)
              } catch {
                // A failed error stream still produces a failing exit status.
              }
            },
          )
        pending.add(task)
      }
    } finally {
      await Promise.all(pending)
    }
    return failed ? 1 : 0
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
