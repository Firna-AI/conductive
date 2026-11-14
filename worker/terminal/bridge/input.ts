import {
  BRIDGE_MAX_PASTE_BYTES,
  BRIDGE_MESSAGE_END,
  BRIDGE_MESSAGE_START,
} from '../../../src/shared/terminal-bridge.ts'

/** A part of the input: keys for the program, or the text of a message. */
export type InputPart =
  | { readonly kind: 'keys'; readonly bytes: Uint8Array }
  | { readonly kind: 'message'; readonly text: string }

const start = new TextEncoder().encode(BRIDGE_MESSAGE_START)
const end = BRIDGE_MESSAGE_END.charCodeAt(0)
const decoder = new TextDecoder()

/** The longest message: a paste in base64, with its nonce and its kind. */
const maxMessage = Math.ceil(BRIDGE_MAX_PASTE_BYTES / 3) * 4 + 128

/** The length of the longest end of `bytes` that begins `start`. */
function partialStart(bytes: Uint8Array): number {
  for (
    let length = Math.min(start.length - 1, bytes.length);
    length > 0;
    length -= 1
  ) {
    const tail = bytes.subarray(bytes.length - length)
    if (tail.every((byte, index) => byte === start[index])) return length
  }
  return 0
}

function indexOfStart(bytes: Uint8Array, from: number): number {
  outer: for (
    let index = from;
    index + start.length <= bytes.length;
    index += 1
  ) {
    for (let offset = 0; offset < start.length; offset += 1)
      if (bytes[index + offset] !== start[offset]) continue outer
    return index
  }
  return -1
}

/**
 * Splits the input of the terminal device into keys and messages of the
 * screen. A message or its start can span chunks. A message has no escape
 * byte, so an escape byte before its end makes the bytes keys again. A
 * message longer than a paste can be is dropped, so the bridge never holds
 * unbounded input. A chunk can end with the first bytes of a message start,
 * such as a lone Escape key. The caller sends them on with `flush` when no
 * more input comes soon.
 */
export class InputSplitter {
  /** The bytes of a message that has no end yet. */
  private message: Uint8Array[] | null = null
  private messageLength = 0
  private dropping = false
  /** The end of the last chunk, when it may begin a message. */
  private held = new Uint8Array(0)

  split(chunk: Uint8Array): InputPart[] {
    const parts: InputPart[] = []
    let data: Uint8Array = chunk
    if (this.held.length > 0) {
      data = new Uint8Array(this.held.length + chunk.length)
      data.set(this.held)
      data.set(chunk, this.held.length)
      this.held = new Uint8Array(0)
    }
    let index = 0
    while (index < data.length) {
      if (this.message) {
        const stop = data.indexOf(end, index)
        const escape = data.indexOf(0x1b, index)
        if (escape >= 0 && (stop < 0 || escape < stop)) {
          this.collect(data.subarray(index, escape))
          this.abandon(parts)
          index = escape
          continue
        }
        const piece = data.subarray(index, stop < 0 ? data.length : stop)
        this.collect(piece)
        if (stop < 0) return parts
        this.finish(parts)
        index = stop + 1
        continue
      }
      const found = indexOfStart(data, index)
      if (found < 0) {
        const rest = data.subarray(index)
        const hold = partialStart(rest)
        const keys = rest.subarray(0, rest.length - hold)
        if (keys.length > 0) parts.push({ kind: 'keys', bytes: keys.slice() })
        this.held = rest.slice(rest.length - hold)
        return parts
      }
      if (found > index)
        parts.push({ kind: 'keys', bytes: data.slice(index, found) })
      this.message = []
      this.messageLength = 0
      this.dropping = false
      index = found + start.length
    }
    return parts
  }

  /** Whether the end of the last chunk waits for more input. */
  get holding(): boolean {
    return this.held.length > 0
  }

  /** Gives the held end of the last chunk, to send on as keys. */
  flush(): Uint8Array {
    const bytes = this.held
    this.held = new Uint8Array(0)
    return bytes
  }

  /** Makes the start and the bytes of an unfinished message keys again. */
  private abandon(parts: InputPart[]): void {
    const pieces = this.dropping ? [] : (this.message ?? [])
    this.message = null
    this.dropping = false
    const bytes = new Uint8Array(
      start.length + pieces.reduce((total, piece) => total + piece.length, 0),
    )
    bytes.set(start)
    let offset = start.length
    for (const piece of pieces) {
      bytes.set(piece, offset)
      offset += piece.length
    }
    parts.push({ kind: 'keys', bytes })
  }

  private collect(piece: Uint8Array): void {
    if (!this.message || this.dropping) return
    this.messageLength += piece.length
    if (this.messageLength > maxMessage) {
      this.dropping = true
      this.message = []
      return
    }
    this.message.push(piece.slice())
  }

  private finish(parts: InputPart[]): void {
    const pieces = this.message ?? []
    const dropped = this.dropping
    this.message = null
    this.dropping = false
    if (dropped) return
    const bytes = new Uint8Array(this.messageLength)
    let offset = 0
    for (const piece of pieces) {
      bytes.set(piece, offset)
      offset += piece.length
    }
    parts.push({ kind: 'message', text: decoder.decode(bytes) })
  }
}
