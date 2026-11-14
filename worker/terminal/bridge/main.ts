/**
 * The terminal bridge. ttyd runs it for each connection, in a terminal
 * device, with the private Node of the image:
 *
 *   node main.ts <tmux> <socket> <repository> [session]
 *
 * It attaches to the tmux session in control mode, and creates the session
 * with a login Bash in the repository folder when it does not exist. It
 * exits with code 3 when tmux exits before the bridge attached, so the
 * launcher can run the plain tmux client.
 */
import { spawn, spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { Bridge } from './bridge.ts'
import { EXIT_BEFORE_HELLO } from './links.ts'

const [tmuxPath, socket, repository, session = 'workspace'] =
  process.argv.slice(2)
if (
  !tmuxPath ||
  !socket ||
  !repository ||
  !/^[A-Za-z0-9_-]{1,64}$/.test(session)
) {
  process.stderr.write(
    'Usage: main.ts <tmux> <socket> <repository> [session]\n',
  )
  process.exit(2)
}

const child = spawn(
  tmuxPath,
  [
    '-N',
    '-S',
    socket,
    '-C',
    'new-session',
    '-A',
    '-s',
    session,
    '-c',
    repository,
    '-f',
    'ignore-size',
    '/bin/bash',
    '-l',
  ],
  { stdio: ['pipe', 'pipe', 'ignore'] },
)

let exiting = false
function exit(code: number): void {
  if (exiting) return
  exiting = true
  child.stdin.end()
  // Exit after the device took the last output.
  process.stdout.write('', () => process.exit(code))
}

const bridge = new Bridge(
  {
    send: (line) => {
      if (!exiting) child.stdin.write(`${line}\n`)
    },
    close: () => child.stdin.end(),
  },
  {
    write: (data) => process.stdout.write(data),
    size: () => ({
      columns: process.stdout.columns || 80,
      rows: process.stdout.rows || 24,
    }),
    writePaste: (bytes) => {
      // The runtime folder of the socket is private to the user.
      const path = join(
        dirname(socket),
        `paste-${randomBytes(8).toString('hex')}`,
      )
      writeFileSync(path, bytes, { mode: 0o600, flag: 'wx' })
      return path
    },
    removePaste: (path) => {
      try {
        unlinkSync(path)
      } catch {
        // tmux or a later bridge can remove it too.
      }
    },
    schedule: (task, milliseconds) => {
      const timer = setTimeout(task, milliseconds)
      return () => clearTimeout(timer)
    },
    exit,
  },
  randomBytes(16).toString('hex'),
)

child.on('error', () => exit(EXIT_BEFORE_HELLO))
child.on('close', () => bridge.tmuxExited())
child.stdout.on('data', (chunk: Buffer) => bridge.controlOutput(chunk))
child.stdin.on('error', () => bridge.tmuxExited())

// Pass every byte as it is, in both directions. Node's raw mode keeps the
// output processing, which would turn each line feed into two bytes.
if (process.stdin.isTTY) {
  const stty = spawnSync('stty', ['raw', '-echo'], {
    stdio: ['inherit', 'ignore', 'ignore'],
  })
  if (stty.status !== 0) process.stdin.setRawMode(true)
}
process.stdin.on('data', (chunk: Buffer) => bridge.input(chunk))
process.stdin.on('end', () => bridge.inputEnded())
process.stdin.on('error', () => bridge.inputEnded())
process.stdout.on('error', () => bridge.inputEnded())
process.stdout.on('resize', () => bridge.resized())
process.on('SIGHUP', () => bridge.inputEnded())
