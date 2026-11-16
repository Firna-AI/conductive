import { PANE_STATE_FORMAT } from './screen.ts'

/**
 * The tmux commands of the bridge. Each value that goes into a command is
 * one that the bridge made or checked, such as a pane ID or a path of its
 * own, so no value holds a quote or a semicolon.
 */

/** Wraps a value in single quotes, which tmux reads with no escapes. */
function quoted(value: string): string {
  if (/['\n;]/.test(value)) throw new Error('A tmux value holds a quote.')
  return `'${value}'`
}

export const stateCommand = `display-message -p ${quoted(PANE_STATE_FORMAT)}`

/**
 * The commands that read the pane, in one command line. tmux runs the line
 * at once, and it keeps the output and the answers of the client in order.
 * So the output after the last answer joins the captures with no gap and no
 * repeat. The line reads every capture that either screen mode needs, so
 * the state in its first answer chooses among them. `-q` keeps the capture
 * of the normal screen from failing when no full-screen program runs, so no
 * later command of the line is lost. The bridge never turns the output of
 * its client off: in tmux 3.4, `refresh-client -f no-output` during a flood
 * of output can stall the client for good.
 */
export const syncCommands: readonly string[] = [
  stateCommand,
  'capture-pane -p -e -J -S -',
  'capture-pane -p -e -J -S - -E -1',
  'capture-pane -p -e -J',
  'capture-pane -p -e -J -a -q',
]

export function resizeCommand(columns: number, rows: number): string {
  return `resize-window -x ${columns} -y ${rows}`
}

/** Sends bytes to the pane as they are, in commands of at most 1,024 bytes. */
export function keyCommands(pane: string, bytes: Uint8Array): string[] {
  const commands: string[] = []
  for (let offset = 0; offset < bytes.length; offset += 1_024) {
    const hex = Array.from(bytes.subarray(offset, offset + 1_024), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join(' ')
    commands.push(`send-keys -t ${quoted(pane)} -H ${hex}`)
  }
  return commands
}

/**
 * Pastes a file through a tmux buffer. `-p` adds the bracketed paste marks
 * when the program asked for them, and `-d` deletes the buffer after.
 */
export function pasteCommands(
  pane: string,
  buffer: string,
  path: string,
): string[] {
  return [
    `load-buffer -b ${quoted(buffer)} ${quoted(path)}`,
    `paste-buffer -p -d -b ${quoted(buffer)} -t ${quoted(pane)}`,
  ]
}

/**
 * Gives the window the colours of the screen. With only control clients,
 * tmux answers a colour query of a program from this style.
 */
export function styleCommand(foreground: string, background: string): string {
  return `set-option -w window-style ${quoted(`fg=${foreground},bg=${background}`)}`
}
