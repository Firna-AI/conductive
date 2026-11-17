import { spawn } from 'node:child_process'

/** Skills use public Git access, independent of turn credentials and Git config. */
export function skillsGit(
  args: readonly string[],
  signal: AbortSignal,
  home: string,
): Promise<string> {
  const env = { ...process.env }
  for (const name of Object.keys(env))
    if (name !== 'PATH' && name !== 'TMPDIR') delete env[name]
  Object.assign(env, {
    HOME: home,
    LC_ALL: 'C',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_TERMINAL_PROMPT: '0',
    GIT_ASKPASS: '',
    SSH_ASKPASS: '',
  })
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['-c', 'credential.helper=', ...args], {
      env,
      signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]),
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const output: Buffer[] = []
    const errors: Buffer[] = []
    let failure: Error | undefined
    child.stdout.on('data', (chunk: Buffer) => output.push(chunk))
    child.stderr.on('data', (chunk: Buffer) => errors.push(chunk))
    child.on('error', (error) => {
      failure = error
    })
    child.on('close', (code) => {
      if (failure) reject(failure)
      else if (code === 0) resolve(Buffer.concat(output).toString('utf8'))
      else reject(new Error(Buffer.concat(errors).toString('utf8').trim()))
    })
  })
}
