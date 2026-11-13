/**
 * Reads the output of a tmux client in control mode (`tmux -C`). tmux writes
 * one line for each event. The answer of each command is a block: a `%begin`
 * line, the raw lines of the answer, and an `%end` or `%error` line. tmux does
 * not escape the lines of an answer, so a captured line can read `%end`. A
 * block therefore ends only at the `%end` or `%error` line whose time, number,
 * and flags match its `%begin` line.
 */

export type ControlEvent =
  | {
      readonly kind: 'block'
      /** The flags of the block: 1 for a command of this client. */
      readonly flags: number
      readonly failed: boolean
      readonly lines: readonly Uint8Array[]
    }
  | {
      readonly kind: 'output'
      readonly pane: string
      readonly data: Uint8Array
    }
  | {
      readonly kind: 'notification'
      readonly name: string
      readonly args: readonly string[]
    }

const newline = 0x0a
const backslash = 0x5c
const decoder = new TextDecoder()

/** Decodes the escaped data of `%output`: `\ooo` stands for one byte. */
export function decodeOutput(text: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(text.length)
  let length = 0
  for (let index = 0; index < text.length; index += 1) {
    const byte = text[index] ?? 0
    if (byte === backslash && index + 3 < text.length) {
      const digits = text.subarray(index + 1, index + 4)
      if (digits.every((digit) => digit >= 0x30 && digit <= 0x37)) {
        bytes[length] =
          ((digits[0] ?? 0) - 0x30) * 64 +
          ((digits[1] ?? 0) - 0x30) * 8 +
          ((digits[2] ?? 0) - 0x30)
        length += 1
        index += 3
        continue
      }
    }
    bytes[length] = byte
    length += 1
  }
  return bytes.slice(0, length)
}

/** The index after the `count`th space of a line, or -1. */
function afterSpaces(line: Uint8Array, count: number): number {
  let seen = 0
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === 0x20) {
      seen += 1
      if (seen === count) return index + 1
    }
  }
  return -1
}

/** The data of `%extended-output %pane age ... : data`. */
function extendedData(line: Uint8Array): Uint8Array | null {
  for (let index = 0; index + 2 < line.length; index += 1) {
    if (
      line[index] === 0x20 &&
      line[index + 1] === 0x3a &&
      line[index + 2] === 0x20
    )
      return line.subarray(index + 3)
  }
  return null
}

function outputEvent(line: Uint8Array, text: string): ControlEvent | null {
  const pane = text.split(' ')[1] ?? ''
  if (text.startsWith('%output ')) {
    const start = afterSpaces(line, 2)
    if (start < 0) return null
    return { kind: 'output', pane, data: decodeOutput(line.subarray(start)) }
  }
  const data = extendedData(line)
  return data === null
    ? null
    : { kind: 'output', pane, data: decodeOutput(data) }
}

export class ControlReader {
  private readonly events: (event: ControlEvent) => void
  private pending: Uint8Array = new Uint8Array(0)
  private block: { guard: string; flags: number; lines: Uint8Array[] } | null =
    null

  constructor(events: (event: ControlEvent) => void) {
    this.events = events
  }

  /** Reads a chunk of the client's output. A line can span chunks. */
  feed(chunk: Uint8Array): void {
    const data = new Uint8Array(this.pending.length + chunk.length)
    data.set(this.pending)
    data.set(chunk, this.pending.length)
    let start = 0
    for (let index = 0; index < data.length; index += 1) {
      if (data[index] !== newline) continue
      this.line(data.subarray(start, index))
      start = index + 1
    }
    this.pending = data.slice(start)
  }

  private line(line: Uint8Array): void {
    if (this.block) {
      const text = decoder.decode(line.subarray(0, 80))
      const [name, ...guard] = text.split(' ')
      if (
        (name === '%end' || name === '%error') &&
        guard.join(' ') === this.block.guard
      ) {
        const { flags, lines } = this.block
        this.block = null
        this.events({ kind: 'block', flags, failed: name === '%error', lines })
      } else {
        this.block.lines.push(line.slice())
      }
      return
    }
    const head = decoder.decode(line.subarray(0, 200))
    if (head.startsWith('%begin ')) {
      const guard = head.slice('%begin '.length)
      const flags = Number(guard.split(' ')[2] ?? '0')
      this.block = { guard, flags, lines: [] }
      return
    }
    if (head.startsWith('%output ') || head.startsWith('%extended-output ')) {
      const event = outputEvent(line, head)
      if (event) this.events(event)
      return
    }
    if (head.startsWith('%')) {
      const [name = '', ...args] = decoder.decode(line).split(' ')
      this.events({ kind: 'notification', name: name.slice(1), args })
    }
  }
}
