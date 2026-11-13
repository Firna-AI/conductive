/**
 * The private messages between the terminal bridge in the cloud computer and
 * the terminal screen in the browser. Both sides send them as an OSC with the
 * number `BRIDGE_OSC`, which ends with BEL. The bridge writes its messages in
 * the output. The screen writes its messages in the input, and the bridge
 * takes them out, so they never reach the shell.
 *
 * Each message starts with the nonce of the connection. The bridge makes the
 * nonce and sends it in its hello. The screen accepts only the first hello of
 * a connection, and each later message only with its nonce, because a program
 * in the shell can write any OSC.
 *
 * The bridge runs this file with Node's type stripping, so it uses erasable
 * syntax only and no API of Node or of the browser.
 */

export const BRIDGE_OSC = 7717
export const BRIDGE_VERSION = 1

/** The largest shared size that either side accepts. */
const BRIDGE_MAX_COLUMNS = 500
const BRIDGE_MAX_ROWS = 200

/** The lines of output history that tmux and the screen each keep. */
export const TERMINAL_HISTORY_LINES = 2_000

/** The bridge sends a mark after each such number of output bytes. */
export const BRIDGE_MARK_BYTES = 64 * 1_024

/** The bridge drops the output while this many marks wait for an answer. */
export const BRIDGE_MARK_WINDOW = 16

/** The longest paste, in bytes of UTF-8, that the bridge accepts. */
export const BRIDGE_MAX_PASTE_BYTES = 4 * 1_024 * 1_024

/** A size of the shared terminal, in columns and rows. */
export interface BridgeSize {
  readonly columns: number
  readonly rows: number
}

/** A message of the bridge to the screen. */
export type BridgeOutputMessage =
  | {
      readonly kind: 'hello'
      readonly version: number
      readonly size: BridgeSize
    }
  | { readonly kind: 'size'; readonly size: BridgeSize }
  | { readonly kind: 'mark'; readonly mark: number }

/** A message of the screen to the bridge. */
export type BridgeInputMessage =
  | {
      readonly kind: 'hello'
      readonly foreground: string
      readonly background: string
    }
  | { readonly kind: 'ack'; readonly mark: number }
  | { readonly kind: 'focus'; readonly focused: boolean }
  | { readonly kind: 'paste'; readonly base64: string }
  | { readonly kind: 'mouse'; readonly base64: string }

const noncePattern = /^[0-9a-f]{32}$/
const colourPattern = /^#[0-9a-f]{6}$/
const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/

/** The start of each message, as the bridge looks for it in the input. */
export const BRIDGE_MESSAGE_START = `\x1b]${BRIDGE_OSC};`
export const BRIDGE_MESSAGE_END = '\x07'

/** A nonce as the bridge makes it: 16 random bytes in lowercase hex. */
function isBridgeNonce(value: string): boolean {
  return noncePattern.test(value)
}

/** Keeps a size inside the limits, with at least one column and one row. */
export function clampBridgeSize(size: BridgeSize): BridgeSize {
  return {
    columns: Math.min(
      Math.max(Math.trunc(size.columns), 1),
      BRIDGE_MAX_COLUMNS,
    ),
    rows: Math.min(Math.max(Math.trunc(size.rows), 1), BRIDGE_MAX_ROWS),
  }
}

function count(value: string | undefined, max: number): number | null {
  if (value === undefined || !/^[0-9]{1,9}$/.test(value)) return null
  const number = Number(value)
  return number >= 1 && number <= max ? number : null
}

function size(columns: string | undefined, rows: string | undefined) {
  const width = count(columns, BRIDGE_MAX_COLUMNS)
  const height = count(rows, BRIDGE_MAX_ROWS)
  return width === null || height === null
    ? null
    : { columns: width, rows: height }
}

function mark(value: string | undefined): number | null {
  if (value === undefined || !/^[0-9]{1,15}$/.test(value)) return null
  return Number(value)
}

/** The OSC of one message, with the nonce. */
function message(nonce: string, fields: readonly (string | number)[]): string {
  return `${BRIDGE_MESSAGE_START}${[nonce, ...fields].join(';')}${BRIDGE_MESSAGE_END}`
}

export function bridgeOutputMessage(
  nonce: string,
  value: BridgeOutputMessage,
): string {
  switch (value.kind) {
    case 'hello':
      return message(nonce, [
        'hello',
        value.version,
        value.size.columns,
        value.size.rows,
      ])
    case 'size':
      return message(nonce, ['size', value.size.columns, value.size.rows])
    case 'mark':
      return message(nonce, ['mark', value.mark])
  }
}

export function bridgeInputMessage(
  nonce: string,
  value: BridgeInputMessage,
): string {
  switch (value.kind) {
    case 'hello':
      return message(nonce, ['hello', value.foreground, value.background])
    case 'ack':
      return message(nonce, ['ack', value.mark])
    case 'focus':
      return message(nonce, ['focus', value.focused ? 'in' : 'out'])
    case 'paste':
      return message(nonce, ['paste', value.base64])
    case 'mouse':
      return message(nonce, ['mouse', value.base64])
  }
}

/**
 * Reads the text of a message after `BRIDGE_OSC;`, as xterm.js gives it to an
 * OSC handler. Returns null for a message that is not well formed.
 */
export function parseBridgeOutput(
  text: string,
): { nonce: string; message: BridgeOutputMessage } | null {
  const [nonce = '', kind, ...fields] = text.split(';')
  if (!isBridgeNonce(nonce)) return null
  if (kind === 'hello' && fields.length === 3) {
    const version = count(fields[0], 1_000)
    const shared = size(fields[1], fields[2])
    return version === null || shared === null
      ? null
      : { nonce, message: { kind, version, size: shared } }
  }
  if (kind === 'size' && fields.length === 2) {
    const shared = size(fields[0], fields[1])
    return shared === null ? null : { nonce, message: { kind, size: shared } }
  }
  if (kind === 'mark' && fields.length === 1) {
    const value = mark(fields[0])
    return value === null ? null : { nonce, message: { kind, mark: value } }
  }
  return null
}

/** Reads the text between `BRIDGE_MESSAGE_START` and BEL of the screen. */
export function parseBridgeInput(
  text: string,
): { nonce: string; message: BridgeInputMessage } | null {
  const [nonce = '', kind, ...fields] = text.split(';')
  if (!isBridgeNonce(nonce)) return null
  const [first, second] = fields
  if (kind === 'hello' && fields.length === 2 && first && second) {
    return colourPattern.test(first) && colourPattern.test(second)
      ? { nonce, message: { kind, foreground: first, background: second } }
      : null
  }
  if (kind === 'ack' && fields.length === 1) {
    const value = mark(first)
    return value === null ? null : { nonce, message: { kind, mark: value } }
  }
  if (kind === 'focus' && fields.length === 1) {
    return first === 'in' || first === 'out'
      ? { nonce, message: { kind, focused: first === 'in' } }
      : null
  }
  if (
    (kind === 'paste' || kind === 'mouse') &&
    fields.length === 1 &&
    first !== undefined
  ) {
    return base64Pattern.test(first)
      ? { nonce, message: { kind, base64: first } }
      : null
  }
  return null
}
