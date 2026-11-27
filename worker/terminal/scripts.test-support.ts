import { spawn } from 'node:child_process'
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import {
  testDirectory,
  testSocketDirectory,
} from '../test-support/test-directory'
import type { TerminalScriptOptions } from './scripts'
import { shellArgument } from './privileged'

export async function scriptFixture() {
  const files = await testDirectory('terminal-')
  const root = files.path
  const runtime = await testSocketDirectory(join(root, 'runtime folder'))
  const entropyInput = `${root}/entropy-input`
  const calls = `${root}/entropy-calls`
  const capturedEntropy = `${root}/entropy-captured`
  await writeFile(entropyInput, Buffer.alloc(32, 17))
  const entropy = `${root}/entropy`
  await writeFile(
    entropy,
    `#!/bin/sh
printf 'called\\n' >> '${calls}'
for argument in "$@"; do input="$argument"; done
cat -- "$input" > '${capturedEntropy}'
exec od "$@"
`,
  )
  await chmod(entropy, 0o700)
  const terminal = `${root}/terminal`
  await writeFile(
    terminal,
    `#!/bin/sh
printf 'started\\n' > '${root}/started'
`,
  )
  await chmod(terminal, 0o700)
  const repository = `${root}/workspace repository`
  const multiplexer = `${root}/multiplexer`
  await writeFile(
    multiplexer,
    `#!/bin/sh
printf '%s\\0' "$PWD" "$CONDUCTIVE_LAUNCH_TEST" "$@"
`,
  )
  await chmod(multiplexer, 0o700)
  const environmentFile = `${root}/environment.sh`
  await mkdir(repository)
  await writeFile(
    environmentFile,
    `CONDUCTIVE_REPOSITORY_DIR=${shellArgument(repository)}\nCONDUCTIVE_LAUNCH_TEST='workspace environment'\n`,
  )
  const options: TerminalScriptOptions = {
    runtimeDirectory: runtime.path,
    restoreMarker: `${runtime.path}/restore-ended`,
    environmentFile,
    repositoryFoldersFile: `${root}/repository-folders`,
    owner: String(process.getuid?.()),
    group: String(process.getgid?.()),
    entropyCommand: [entropy, '-An', '-v', '-N32', '-tx1', entropyInput],
    terminalCommand: [terminal],
    multiplexerCommand: [multiplexer],
    // No bridge exists here, so the launcher runs the plain tmux client.
    bridgeCommand: [`${root}/node`, `${root}/bridge.ts`],
  }
  return {
    root,
    options,
    calls,
    entropyInput,
    capturedEntropy,
    repository,
    terminal,
    multiplexer,
    sessionSocket: `${options.runtimeDirectory}/tmux.sock`,
    readPassword: () =>
      readFile(`${options.runtimeDirectory}/password`, 'utf8'),
    dispose: async () => {
      try {
        await runtime.remove()
      } finally {
        await files.remove()
      }
    },
  }
}

/**
 * Runs the lines in an interactive Bash, which runs PROMPT_COMMAND before
 * each line. Its error output also holds the prompts and the echoed lines.
 */
export function runInteractiveBash(
  lines: readonly string[],
  options: {
    folder: string
    home: string
    promptCommand: string
    historyFile?: string
  },
) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>(
    (done, reject) => {
      const child = spawn('/bin/bash', ['--norc', '--noprofile', '-i'], {
        cwd: options.folder,
        env: {
          ...process.env,
          HOME: options.home,
          HISTFILE: options.historyFile ?? '',
          PS1: '',
          PROMPT_COMMAND: options.promptCommand,
        },
      })
      let stdout = ''
      let stderr = ''
      child.stdout.on('data', (chunk) => {
        stdout += String(chunk)
      })
      child.stderr.on('data', (chunk) => {
        stderr += String(chunk)
      })
      child.once('error', reject)
      child.once('close', (code) => done({ code, stdout, stderr }))
      child.stdin.end(`${lines.join('\n')}\n`)
    },
  )
}

export function runScript(
  script: string,
  ordinaryPermissions = false,
  environment = process.env,
) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>(
    (done, reject) => {
      const child = ordinaryPermissions
        ? spawn(
            '/usr/bin/setpriv',
            ['--inh-caps=-all', '--ambient-caps=-all', '/bin/sh', '-c', script],
            { env: environment },
          )
        : spawn('/bin/sh', ['-c', script], { env: environment })
      let stdout = ''
      let stderr = ''
      child.stdout.on('data', (chunk) => {
        stdout += String(chunk)
      })
      child.stderr.on('data', (chunk) => {
        stderr += String(chunk)
      })
      child.once('error', reject)
      child.once('close', (code) => done({ code, stdout, stderr }))
    },
  )
}
