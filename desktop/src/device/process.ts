import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { userInfo } from 'node:os'

export interface ProcessEvents {
  stdout(bytes: Uint8Array): void
  stderr(bytes: Uint8Array): void
  error(): void
  close(code: number | null): void
}
export interface CommandProcess {
  kill(): void
  dispose(): void
}
export type LaunchCommand = (
  command: string,
  folder: string,
  events: ProcessEvents,
) => CommandProcess
type SpawnShell = (
  shell: string,
  arguments_: readonly string[],
  options: {
    cwd: string
    detached: true
    stdio: ['ignore', 'pipe', 'pipe']
  },
) => ChildProcess

function commandFolder(folder: string, home: () => string): string {
  if (folder === '~') return home()
  if (folder.startsWith('~/'))
    return home().replace(/\/$/, '') + folder.slice(1)
  return folder
}

/** Detached Unix children have a process group we can cancel as a whole. */
export function localCommandLauncher(
  shell = userInfo().shell || process.env.SHELL || '/bin/zsh',
  create: SpawnShell = spawn,
  kill = process.kill,
  home: () => string = () => userInfo().homedir,
): LaunchCommand {
  return (command, folder, events) => {
    const child = create(shell, ['-l', '-c', command], {
      cwd: commandFolder(folder, home),
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    child.stdout?.on('data', events.stdout)
    child.stderr?.on('data', events.stderr)
    child.on('error', events.error)
    child.on('close', events.close)
    return {
      kill() {
        if (child.pid === undefined) return
        try {
          kill(-child.pid, 'SIGKILL')
        } catch {
          // An already-exited process group is the normal completion case.
        }
      },
      dispose() {
        child.stdout?.removeListener('data', events.stdout)
        child.stderr?.removeListener('data', events.stderr)
        child.stdout?.destroy()
        child.stderr?.destroy()
        child.removeListener('close', events.close)
        // Keep the error listener until the child closes. Never expose its error.
      },
    }
  }
}
