import { parseArgs } from 'node:util'

import { readDeviceCommandInput } from '../src/shared/device-read.ts'
import type { WorkspaceToolClient } from './client.ts'
import type { ToolOutput } from './cli.ts'
import { ToolInputError } from './input.ts'

export async function runMacCli(
  args: readonly string[],
  client: WorkspaceToolClient,
  output: ToolOutput,
): Promise<number> {
  const { values, positionals } = parseArgs({
    args: [...args],
    allowPositionals: true,
    options: {
      command: { type: 'string' },
      folder: { type: 'string' },
      reason: { type: 'string' },
      'timeout-seconds': { type: 'string' },
      'longer-timeout-reason': { type: 'string' },
      'request-id': { type: 'string' },
    },
  })
  if (
    positionals.length !== 2 ||
    positionals[0] !== 'mac' ||
    positionals[1] !== 'run'
  )
    throw new ToolInputError('Use mac run with a command, folder, and reason.')
  const input = readDeviceCommandInput({
    requestId: values['request-id'] ?? crypto.randomUUID(),
    command: values.command,
    folder: values.folder,
    reason: values.reason,
    ...(values['timeout-seconds'] !== undefined && {
      timeoutSeconds: Number(values['timeout-seconds']),
    }),
    ...(values['longer-timeout-reason'] !== undefined && {
      longerTimeoutReason: values['longer-timeout-reason'],
    }),
  })
  const response = await client.runMacCommand(input)
  output.stdout(`${JSON.stringify(response)}\n`)
  return response.request.state === 'completed' &&
    response.request.result?.exitCode === 0
    ? 0
    : 1
}
