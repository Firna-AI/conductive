import { spawn } from 'node:child_process'
import { delimiter, dirname } from 'node:path'
import process from 'node:process'

import type { CommandResult } from '../sandbox/provider'

/** Capture child failures as results so the integration test can assert them. */
export function imageTestProcess(
  executable: string,
  args: readonly string[],
  input = '',
  environment: Readonly<Record<string, string | undefined>> = {},
): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn(executable, [...args], {
      env: {
        PATH: [dirname(process.execPath), '/usr/bin', '/bin'].join(delimiter),
        ...environment,
      },
    })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk
    })
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk
    })
    child.once('error', (error: Error) => {
      stderr += error.message
    })
    child.stdin.on('error', (error: Error) => {
      stderr += error.message
    })
    child.once('close', (exitCode) => {
      resolve({ exitCode, stdout, stderr, timedOut: false })
    })
    if (input.length > 0) {
      child.stdin.end(input)
    } else {
      child.stdin.end()
    }
  })
}
