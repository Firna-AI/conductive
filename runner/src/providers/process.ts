import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'

export interface ProcessPort {
  write(line: string): void
  onLine(listener: (line: string) => void): void
  onExit(listener: () => void): void
  close(): void | Promise<void>
}

export interface ProcessRequest {
  command: string
  args: readonly string[]
  cwd: string
  env: Record<string, string | undefined>
}

export type StartProcess = (request: ProcessRequest) => ProcessPort

export const startProcess: StartProcess = (request) => {
  const child = spawn(request.command, [...request.args], {
    cwd: request.cwd,
    env: request.env,
    stdio: ['pipe', 'pipe', 'ignore'],
  })
  const lines = createInterface({ input: child.stdout })
  const completion = new Promise<void>((resolve) => {
    child.once('exit', () => resolve())
    child.once('error', () => {
      if (child.pid === undefined) resolve()
    })
  })
  const exits = new Set<() => void>()
  let exited = false
  const exit = () => {
    if (exited) return
    exited = true
    for (const listener of exits) listener()
  }
  child.on('exit', exit)
  child.on('error', exit)
  child.stdin.on('error', exit)
  return {
    write: (line) => {
      if (exited) throw new Error('The agent process ended.')
      child.stdin.write(`${line}\n`)
    },
    onLine: (listener) => {
      lines.on('line', listener)
    },
    onExit: (listener) => {
      exits.add(listener)
      if (exited) listener()
    },
    close: async () => {
      lines.close()
      child.stdin.end()
      child.kill('SIGTERM')
      await completion
      child.stdout.destroy()
    },
  }
}
