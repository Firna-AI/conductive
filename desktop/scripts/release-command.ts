import { spawn } from 'node:child_process'

/** A separate process group lets cancellation stop the tool and its children. */
export function runReleaseCommand(
  program: string,
  args: string[],
  environment: NodeJS.ProcessEnv,
  signal: AbortSignal,
  options: { cwd?: string; inherit?: boolean } = {},
): Promise<{ stdout: string; stderr: string }> {
  signal.throwIfAborted()
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, {
      cwd: options.cwd,
      env: environment,
      detached: true,
      stdio: options.inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    let failure: Error | undefined
    let terminationTimer: ReturnType<typeof setTimeout> | undefined
    const stopGroup = (kind: NodeJS.Signals) => {
      if (!child.pid) return
      try {
        process.kill(-child.pid, kind)
      } catch {
        // The process group can exit before the signal arrives.
      }
    }
    const cancel = () => {
      stopGroup('SIGTERM')
      terminationTimer = setTimeout(() => stopGroup('SIGKILL'), 2_000)
      terminationTimer.unref()
    }
    signal.addEventListener('abort', cancel, { once: true })
    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    child.on('error', (error) => {
      failure = error
    })
    child.once('close', (code) => {
      clearTimeout(terminationTimer)
      signal.removeEventListener('abort', cancel)
      if (signal.aborted) reject(new Error('Release cancelled'))
      else if (failure || code !== 0)
        reject(
          new Error(
            `${program} failed: ${failure?.message ?? (stderr || `exit ${code}`)}`,
          ),
        )
      else resolve({ stdout, stderr })
    })
    if (signal.aborted) cancel()
  })
}
