import { backgroundAfter } from './style.ts'

/**
 * The state of a tmux pane, and the bytes that rebuild it in a new terminal:
 * the history above the screen, the screen, the cursor, and the modes that a
 * program set. tmux 3.4 reports these modes as formats. It does not report
 * the bracketed paste mode, so the bridge sends each paste through tmux. It
 * does not report the character sets either, so the rebuild selects the
 * ones that programs of the `tmux-256color` terminal expect.
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
  'alternate_saved_x',
  'alternate_saved_y',
  'cursor_flag',
  'keypad_cursor_flag',
  'keypad_flag',
  'insert_flag',
  'wrap_flag',
  'origin_flag',
  'scroll_region_upper',
  'scroll_region_lower',
  'mouse_standard_flag',
  'mouse_button_flag',
  'mouse_all_flag',
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

/** Selects ASCII as G0 and line drawing as G1, and shifts in G0. */
const characterSets = '\x1b(B\x1b)0\x0f'

/** Ends a capture: no colour, and G0, so no run of it stays open. */
const captureEnd = `${reset}\x0f`

/**
 * Prints captures as a flow from the cursor. tmux joined each line that it
 * wrapped, so xterm.js wraps it again at the same width and keeps it one
 * line for a copy. A line break follows each line but the last. The style
 * carries through each break, as tmux wrote it, but the background goes off
 * around the break, so a scroll fills no row with it. Each capture starts
 * from the default style, so a reset and SI end each capture.
 */
function flow(
  captures: readonly (readonly Uint8Array[])[],
): (string | Uint8Array)[] {
  const parts: (string | Uint8Array)[] = []
  for (const lines of captures) {
    if (lines.length === 0) continue
    if (parts.length > 0) parts.push('\r\n')
    let background: string | null = null
    lines.forEach((line, index) => {
      if (index > 0)
        parts.push(background ? `\x1b[49m\r\n${background}` : '\r\n')
      parts.push(line)
      background = backgroundAfter(line, background)
    })
    parts.push(captureEnd)
  }
  return parts
}

function mode(on: number, set: string, unset: string): string {
  return on === 1 ? set : unset
}

/** tmux reports this for a position that it never saved. */
const unset = 4_294_967_295

/** The modes, the scroll region, and the cursor of the pane. */
function modes(state: PaneState): string {
  const { flags } = state
  const mouse = [
    [flags.mouse_standard_flag, 1000],
    [flags.mouse_button_flag, 1002],
    [flags.mouse_all_flag, 1003],
    [flags.mouse_utf8_flag, 1005],
    [flags.mouse_sgr_flag, 1006],
  ]
    .filter(([on]) => on === 1)
    .map(([, number]) => `\x1b[?${number}h`)
    .join('')
  const upper = flags.scroll_region_upper
  const region =
    upper === 0 && flags.scroll_region_lower === state.paneHeight - 1
      ? '\x1b[r'
      : `\x1b[${upper + 1};${flags.scroll_region_lower + 1}r`
  // Origin mode moves the cursor home, and then counts rows from the top
  // of the scroll region.
  const origin = flags.origin_flag === 1
  const row = origin ? state.cursorY - upper : state.cursorY
  return [
    mode(flags.keypad_cursor_flag, '\x1b[?1h', '\x1b[?1l'),
    mode(flags.keypad_flag, '\x1b=', '\x1b>'),
    mode(flags.insert_flag, '\x1b[4h', '\x1b[4l'),
    mode(flags.wrap_flag, '\x1b[?7h', '\x1b[?7l'),
    mouse,
    region,
    origin ? '\x1b[?6h' : '',
    `\x1b[${row + 1};${Math.min(state.cursorX, state.paneWidth - 1) + 1}H`,
    mode(flags.cursor_flag, '\x1b[?25h', '\x1b[?25l'),
  ].join('')
}

/** The captures of a pane, from one command line of the bridge. */
export interface PaneCaptures {
  /** The history and the screen, joined where tmux wrapped them. */
  readonly whole: readonly Uint8Array[]
  /** The history alone, for a pane that shows a full-screen program. */
  readonly history: readonly Uint8Array[]
  /** The screen that the pane shows. */
  readonly screen: readonly Uint8Array[]
  /** The normal screen behind a full-screen program. */
  readonly normal: readonly Uint8Array[]
}

/**
 * The bytes that clear the terminal and rebuild the pane in it. The lines
 * print as a flow, so the history scrolls above the screen and the last
 * lines fill the screen as they do in tmux. When a full-screen program runs,
 * the normal screen prints first, and the program's screen prints on the
 * alternate screen from its top.
 */
export function rebuildPane(
  state: PaneState,
  captures: PaneCaptures,
): Uint8Array {
  const parts: (string | Uint8Array)[] = [
    // Leave a full-screen program, reset the modes, and clear everything.
    '\x1b[?1049l\x1b[r\x1b[?6l\x1b[?1000l\x1b[?1002l\x1b[?1003l\x1b[?1005l\x1b[?1006l',
    `${reset}\x1b[?7h${characterSets}\x1b[H\x1b[2J\x1b[3J`,
  ]
  if (!state.alternate) {
    parts.push(...flow([captures.whole]))
  } else {
    const history = state.historySize > 0 ? captures.history : []
    parts.push(...flow([history, captures.normal]))
    // xterm.js saves this cursor at the switch, and the normal screen gets
    // it back when the program ends.
    const { alternate_saved_x: x, alternate_saved_y: y } = state.flags
    if (x !== unset && y !== unset) parts.push(`\x1b[${y + 1};${x + 1}H`)
    parts.push('\x1b[?1049h\x1b[H\x1b[2J', ...flow([captures.screen]))
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
