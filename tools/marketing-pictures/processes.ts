import { spawn, type ChildProcess } from 'node:child_process'

function killGroup(child: ChildProcess, signal: NodeJS.Signals) {
  if (!child.pid) return
  try {
    if (process.platform === 'win32') child.kill(signal)
    else process.kill(-child.pid, signal)
  } catch (error) {
    if (!(
      error instanceof Error &&
      'code' in error &&
      error.code === 'ESRCH'
    )) {
      throw error
    }
  }
}

/** Keep each command and its children in one group for cancellation. */
export function startProcess(
  command: string,
  args: string[],
  signal: AbortSignal,
  captureStderr = false,
): ChildProcess {
  signal.throwIfAborted()
  const child = spawn(command, args, {
    detached: process.platform !== 'win32',
    stdio: captureStderr ? ['ignore', 'ignore', 'pipe'] : 'inherit',
  })
  const abort = () => killGroup(child, 'SIGTERM')
  signal.addEventListener('abort', abort, { once: true })
  child.once('close', () => signal.removeEventListener('abort', abort))
  return child
}

export async function stopProcess(child: ChildProcess): Promise<void> {
  if (!child.pid) return
  const exited = new Promise<void>((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) resolve()
    else child.once('close', () => resolve())
  })
  killGroup(child, 'SIGTERM')
  const timer = setTimeout(() => killGroup(child, 'SIGKILL'), 3000)
  try {
    await exited
  } finally {
    clearTimeout(timer)
  }
}

export async function buildMockups(signal: AbortSignal): Promise<void> {
  const child = startProcess('npm', ['run', 'mockups:build'], signal)
  try {
    const code = await new Promise<number | null>((resolve, reject) => {
      child.once('error', reject)
      child.once('close', resolve)
    })
    signal.throwIfAborted()
    if (code !== 0) throw new Error(`Mockup build exited with code ${code}`)
  } finally {
    await stopProcess(child)
  }
}
