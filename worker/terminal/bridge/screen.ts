/**
 * The state of a tmux pane, and the bytes that rebuild it in a new terminal:
 * the history above the screen, the screen, the cursor, and the modes that a
 * program set. tmux 3.4 reports these modes as formats. It does not report
 * the bracketed paste mode, so the bridge sends each paste through tmux.
 */

const fields = [
  'pane_id',
  'window_id',
  'session_id',
  'pane_width',
  'pane_height',
  'window_width',
  'window_height',
  'history_size',
  'alternate_on',
  'cursor_x',
  'cursor_y',
  'cursor_flag',
  'keypad_cursor_flag',
  'keypad_flag',
  'insert_flag',
  'wrap_flag',
  'scroll_region_upper',
  'scroll_region_lower',
  'mouse_standard_flag',
  'mouse_button_flag',
  'mouse_any_flag',
  'mouse_sgr_flag',
  'mouse_utf8_flag',
] as const

type Field = (typeof fields)[number]

/** The format that `display-message -p` answers with one pane state. */
export const PANE_STATE_FORMAT = fields.map((name) => `#{${name}}`).join(' ')

export interface PaneState {
  readonly pane: string
  readonly window: string
  readonly session: string
  readonly paneWidth: number
  readonly paneHeight: number
  readonly windowWidth: number
  readonly windowHeight: number
  readonly historySize: number
  readonly alternate: boolean
  readonly cursorX: number
  readonly cursorY: number
  readonly flags: Readonly<Record<Field, number>>
}

/** Reads the answer of `PANE_STATE_FORMAT`, or null when it is not one. */
export function parsePaneState(line: string): PaneState | null {
  const values = line.trim().split(' ')
  if (values.length !== fields.length) return null
  const [pane = '', window = '', session = ''] = values
  if (
    !/^%\d+$/.test(pane) ||
    !/^@\d+$/.test(window) ||
    !/^\$\d+$/.test(session)
  )
    return null
  const numbers = values.slice(3).map((value) => Number(value || '0'))
  if (numbers.some((value) => !Number.isInteger(value) || value < 0))
    return null
  const flags = Object.fromEntries(
    fields.map((name, index) => [
      name,
      index < 3 ? 0 : (numbers[index - 3] ?? 0),
    ]),
  ) as Record<Field, number>
  return {
    pane,
    window,
    session,
    paneWidth: flags.pane_width,
    paneHeight: flags.pane_height,
    windowWidth: flags.window_width,
    windowHeight: flags.window_height,
    historySize: flags.history_size,
    alternate: flags.alternate_on === 1,
    cursorX: flags.cursor_x,
    cursorY: flags.cursor_y,
    flags,
  }
}

const encoder = new TextEncoder()
const reset = '\x1b[0m'

/** One screen of rows, each drawn at its own place. */
function rows(
  lines: readonly Uint8Array[],
  height: number,
): (string | Uint8Array)[] {
  const parts: (string | Uint8Array)[] = []
  lines.slice(0, height).forEach((line, index) => {
    parts.push(`\x1b[${index + 1};1H`, line, reset)
  })
  return parts
}

function mode(on: number, set: string, unset: string): string {
  return on === 1 ? set : unset
}

/** The modes, the scroll region, and the cursor of the pane. */
function modes(state: PaneState): string {
  const { flags } = state
  const mouse = [
    [flags.mouse_standard_flag, 1000],
    [flags.mouse_button_flag, 1002],
    [flags.mouse_any_flag, 1003],
    [flags.mouse_utf8_flag, 1005],
    [flags.mouse_sgr_flag, 1006],
  ]
    .filter(([on]) => on === 1)
    .map(([, number]) => `\x1b[?${number}h`)
    .join('')
  const region =
    flags.scroll_region_upper === 0 &&
    flags.scroll_region_lower === state.paneHeight - 1
      ? '\x1b[r'
      : `\x1b[${flags.scroll_region_upper + 1};${flags.scroll_region_lower + 1}r`
  return [
    mode(flags.keypad_cursor_flag, '\x1b[?1h', '\x1b[?1l'),
    mode(flags.keypad_flag, '\x1b=', '\x1b>'),
    mode(flags.insert_flag, '\x1b[4h', '\x1b[4l'),
    mode(flags.wrap_flag, '\x1b[?7h', '\x1b[?7l'),
    mouse,
    region,
    `\x1b[${state.cursorY + 1};${state.cursorX + 1}H`,
    mode(flags.cursor_flag, '\x1b[?25h', '\x1b[?25l'),
  ].join('')
}

/**
 * The bytes that clear the terminal and rebuild the pane in it. `history`
 * holds the lines above the screen, joined where tmux wrapped them. `normal`
 * holds the rows of the normal screen. `alternate` holds the rows of a
 * full-screen program, when one runs.
 */
export function rebuildPane(
  state: PaneState,
  history: readonly Uint8Array[],
  normal: readonly Uint8Array[],
  alternate: readonly Uint8Array[] | null,
): Uint8Array {
  const parts: (string | Uint8Array)[] = [
    // Leave a full-screen program, reset the modes, and clear everything.
    '\x1b[?1049l\x1b[r\x1b[?1000l\x1b[?1002l\x1b[?1003l\x1b[?1005l\x1b[?1006l',
    `${reset}\x1b[H\x1b[2J\x1b[3J`,
  ]
  for (const line of history) parts.push(line, `${reset}\r\n`)
  // New lines move the history above the screen, so the rows draw over
  // blank rows and the history stays whole.
  if (history.length > 0) parts.push('\n'.repeat(state.paneHeight - 1))
  parts.push(...rows(normal, state.paneHeight))
  if (alternate) {
    parts.push('\x1b[?1049h\x1b[H\x1b[2J', ...rows(alternate, state.paneHeight))
  }
  parts.push(modes(state))
  const chunks = parts.map((part) =>
    typeof part === 'string' ? encoder.encode(part) : part,
  )
  const bytes = new Uint8Array(
    chunks.reduce((total, chunk) => total + chunk.length, 0),
  )
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }
  return bytes
}
