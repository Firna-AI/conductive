import { spawn } from 'node:child_process'
import { chmod, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import type { TerminalScriptOptions } from './scripts'

export async function scriptFixture() {
  const parent = resolve(
    '.context/boat-native-remote-workspaces/owner-fix-round-2/script-runs',
  )
  await mkdir(parent, { recursive: true })
  const root = await mkdtemp(`${parent}/run-`)
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
  const options: TerminalScriptOptions = {
    runtimeDirectory: `${root}/runtime folder`,
    owner: String(process.getuid?.()),
    group: String(process.getgid?.()),
    entropyCommand: [entropy, '-An', '-v', '-N32', '-tx1', entropyInput],
    terminalCommand: [terminal],
  }
  return {
    root,
    options,
    calls,
    entropyInput,
    capturedEntropy,
    readPassword: () =>
      readFile(`${options.runtimeDirectory}/password`, 'utf8'),
  }
}

export function runScript(script: string, ordinaryPermissions = false) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>(
    (done, reject) => {
      const child = ordinaryPermissions
        ? spawn('/usr/bin/setpriv', [
            '--inh-caps=-all',
            '--ambient-caps=-all',
            '/bin/sh',
            '-c',
            script,
          ])
        : spawn('/bin/sh', ['-c', script])
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
