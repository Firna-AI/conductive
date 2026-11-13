import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'

import xterm from '@xterm/headless'
import { vi } from 'vitest'

import {
  BRIDGE_OSC,
  TERMINAL_HISTORY_LINES,
} from '../../../src/shared/terminal-bridge'

/** Whether to run the tests with a real tmux. CI installs tmux, so it never skips them. */
export const runTmuxTests =
  spawnSync('tmux', ['-V'], { stdio: 'ignore' }).status === 0 ||
  Boolean(process.env.CI)

const main = resolve('worker/terminal/bridge/main.ts')

/**
 * A terminal device for the bridge: Python's `pty` module runs the command
 * in a new terminal device of the given size, copies the input of this
 * process to it, and copies its output back.
 */
const ptyRunner = `
import os, pty, sys, fcntl, termios, struct, select
rows, cols = int(sys.argv[1]), int(sys.argv[2])
pid, fd = pty.fork()
if pid == 0:
    fcntl.ioctl(0, termios.TIOCSWINSZ, struct.pack('HHHH', rows, cols, 0, 0))
    os.execvp(sys.argv[3], sys.argv[3:])
# Never block, as ttyd does not: a blocked write of input would stop the
# reads of output, while the bridge waits for its output to be read.
for handle in (fd, 0, 1):
    os.set_blocking(handle, False)
to_device, to_out, open_in = b'', b'', True
while True:
    readable = [fd] + ([0] if open_in else [])
    writable = ([fd] if to_device else []) + ([1] if to_out else [])
    ready_read, ready_write, _ = select.select(readable, writable, [])
    if fd in ready_read:
        try:
            data = os.read(fd, 65536)
        except OSError:
            break
        if not data:
            break
        to_out += data
    if 0 in ready_read:
        data = os.read(0, 65536)
        if data:
            to_device += data
        else:
            open_in = False
    if 1 in ready_write and to_out:
        to_out = to_out[os.write(1, to_out):]
    if fd in ready_write and to_device:
        to_device = to_device[os.write(fd, to_device):]
os.set_blocking(1, True)
os.write(1, to_out)
_, status = os.waitpid(pid, 0)
sys.exit(os.waitstatus_to_exitcode(status))
`

/** A private tmux server, as the shell server of the image starts it. */
export async function tmuxServer() {
  const parent = resolve('.context/terminal-bridge-tests')
  await mkdir(parent, { recursive: true })
  const root = await mkdtemp(`${parent}/run-`)
  // tmux refuses a socket path of 108 characters or more, so the socket
  // lives in a short folder, not under the checkout.
  const socket = `${await mkdtemp(`${tmpdir()}/cbt-`)}/tmux.sock`
  const runner = `${root}/pty-run.py`
  await writeFile(runner, ptyRunner)
  const started = spawnSync('tmux', [
    '-S',
    socket,
    '-f',
    '/dev/null',
    'start-server',
    ';',
    'set-option',
    '-s',
    'exit-empty',
    'off',
    ';',
    'set-option',
    '-g',
    'history-limit',
    String(TERMINAL_HISTORY_LINES),
  ])
  if (started.status !== 0) throw new Error('tmux did not start.')
  const tmux = (...args: string[]) =>
    spawnSync('tmux', ['-S', socket, ...args], { encoding: 'utf8' }).stdout
  const viewers: Viewer[] = []
  return {
    root,
    socket,
    tmux,
    /** Waits until a tmux format of the session has the value. */
    async waitForFormat(format: string, value: string): Promise<void> {
      await vi.waitFor(
        () => {
          const now = tmux('display-message', '-p', '-t', 'workspace', format)
          if (now.trim() !== value) throw new Error(`${format} is ${now}`)
        },
        { timeout: 10_000, interval: 20 },
      )
    },
    connect(rows: number, columns: number) {
      const viewer = new Viewer(runner, socket, root, rows, columns)
      viewers.push(viewer)
      return viewer
    },
    stop() {
      for (const viewer of viewers) viewer.close()
      tmux('kill-server')
    },
  }
}

/** One connection: the bridge in its own terminal device. */
class Viewer {
  readonly rows: number
  readonly columns: number
  private readonly process: ChildProcess
  private data = Buffer.alloc(0)
  readonly exited: Promise<number | null>

  constructor(
    runner: string,
    socket: string,
    repository: string,
    rows: number,
    columns: number,
  ) {
    this.rows = rows
    this.columns = columns
    this.process = spawn('python3', [
      runner,
      String(rows),
      String(columns),
      process.execPath,
      main,
      'tmux',
      socket,
      repository,
    ])
    this.process.stdout?.on('data', (chunk: Buffer) => {
      this.data = Buffer.concat([this.data, chunk])
    })
    this.exited = new Promise((done) =>
      this.process.on('close', (code) => done(code)),
    )
  }

  get output(): Buffer {
    return this.data
  }

  /** The nonce of the hello of the bridge. */
  get nonce(): string {
    const found = new RegExp(`\\x1b\\]${BRIDGE_OSC};([0-9a-f]{32});hello`).exec(
      this.data.toString('latin1'),
    )
    if (!found?.[1]) throw new Error('The bridge sent no hello.')
    return found[1]
  }

  write(input: string | Uint8Array): void {
    this.process.stdin?.write(input)
  }

  /** The length of the output now, to wait for text after it. */
  get mark(): number {
    return this.data.length
  }

  /** Waits until the output after `from` holds the text. */
  async waitFor(
    text: string | RegExp,
    milliseconds = 10_000,
    from = 0,
  ): Promise<void> {
    const deadline = Date.now() + milliseconds
    while (Date.now() < deadline) {
      const output = this.data.subarray(from).toString('utf8')
      if (typeof text === 'string' ? output.includes(text) : text.test(output))
        return
      await new Promise((done) => setTimeout(done, 50))
    }
    throw new Error(
      `The output never held ${String(text)}. It ends with ${JSON.stringify(this.data.toString('utf8').slice(-400))}`,
    )
  }

  close(): void {
    this.process.kill()
  }

  /** The output as xterm.js shows it, with the private messages. */
  async screen() {
    const terminal = new xterm.Terminal({
      rows: this.rows,
      cols: this.columns,
      scrollback: TERMINAL_HISTORY_LINES,
      allowProposedApi: true,
    })
    const messages: string[] = []
    terminal.parser.registerOscHandler(BRIDGE_OSC, (text) => {
      messages.push(text.split(';').slice(1).join(';'))
      return true
    })
    await new Promise<void>((done) => terminal.write(this.data, done))
    const buffer = terminal.buffer.active
    const lines: string[] = []
    for (let index = 0; index < buffer.length; index += 1)
      lines.push(buffer.getLine(index)?.translateToString(true) ?? '')
    return { buffer, lines, messages }
  }
}

/** The numbers that the lines show, for a check of `seq` output. */
export function numbers(lines: readonly string[]): number[] {
  return lines.filter((line) => /^\d+$/.test(line.trim())).map(Number)
}
