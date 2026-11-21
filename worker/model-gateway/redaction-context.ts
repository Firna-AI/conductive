import { JsonStack } from './json-stack'
import { escapedCodes, wordCode } from './redaction-characters'

const whitespace = (byte: number) => [9, 10, 13, 32].includes(byte)
const delimiter = (byte: number) =>
  whitespace(byte) || [44, 93, 125].includes(byte)
const digit = (byte: number) => byte >= 48 && byte <= 57
const numberStart = (bytes: Uint8Array, position: number) =>
  digit(bytes[position]) ||
  (bytes[position] === 45 && digit(bytes[position + 1]))
const literalFor = (byte: number) =>
  byte === 116 ? 'true' : byte === 102 ? 'false' : byte === 110 ? 'null' : null

/** Recognize JSON context. An invalid token resumes plain-text matching without a refusal. */
export class RedactionContext {
  private mode: 'start' | 'json' | 'text' = 'start'
  private string: 'key' | 'value' | null = null
  private escaped = false
  private unicodeDigits = 0
  private unicode = 0
  private literal: string | null = null
  private literalPosition = 0
  private number = false
  private rootDone = false
  private previous: number | undefined
  private readonly stack = new JsonStack()
  private readonly rootScalars: boolean

  constructor(format: 'body' | 'json' | 'text') {
    this.rootScalars = format === 'body'
    if (format === 'text') this.mode = 'text'
  }

  get previousWord(): boolean {
    return wordCode(this.previous)
  }

  shortMode(
    bytes: Uint8Array,
    position: number,
  ): 'text' | 'string' | 'protected' {
    this.prepare(bytes, position)
    if (this.mode === 'text') return 'text'
    if (
      this.string === 'value' &&
      !this.escaped &&
      !this.unicodeDigits &&
      bytes[position] !== 34
    )
      return 'string'
    return 'protected'
  }

  read(bytes: Uint8Array, position: number): void {
    this.prepare(bytes, position)
    const byte = bytes[position]
    if (this.mode !== 'json') {
      this.previous = byte
      return
    }
    if (this.string) {
      if (this.unicodeDigits) {
        this.unicode =
          this.unicode * 16 + Number.parseInt(String.fromCharCode(byte), 16)
        if (--this.unicodeDigits === 0) this.previous = this.unicode
      } else if (this.escaped) {
        this.escaped = false
        if (byte === 117) {
          this.unicodeDigits = 4
          this.unicode = 0
        } else this.previous = escapedCodes[byte] ?? byte
      } else if (byte === 92) this.escaped = true
      else {
        this.previous = byte
        if (byte === 34) {
          if (this.string === 'key') this.stack.top = 'colon'
          else this.completeValue()
          this.string = null
        }
      }
      return
    }
    this.previous = byte
    if (this.literal) {
      if (++this.literalPosition === this.literal.length) {
        this.literal = null
        this.completeValue()
      }
      return
    }
    if (this.number) {
      if (!delimiter(byte)) return
      this.number = false
      this.completeValue()
    }
    if (whitespace(byte)) return
    const top = this.stack.top
    if (byte === 34)
      this.string =
        top === 'object-key' || top === 'object-key-or-end' ? 'key' : 'value'
    else if (byte === 123) this.stack.push('object-key-or-end')
    else if (byte === 91) this.stack.push('array-value-or-end')
    else if (byte === 125 || byte === 93) {
      this.stack.pop()
      this.completeValue()
    } else if (byte === 58) this.stack.top = 'object-value'
    else if (byte === 44)
      this.stack.top =
        top === 'object-comma-or-end' ? 'object-key' : 'array-value'
    else if (numberStart(bytes, position)) this.number = true
    else {
      this.literal = literalFor(byte)
      this.literalPosition = 1
    }
  }

  private prepare(bytes: Uint8Array, position: number): void {
    const byte = bytes[position]
    if (this.mode === 'text' || whitespace(byte)) return
    if (this.mode === 'start')
      this.mode =
        [34, 91, 123].includes(byte) ||
        (this.rootScalars && (numberStart(bytes, position) || literalFor(byte)))
          ? 'json'
          : 'text'
    if (this.mode !== 'json') return
    if (this.string) {
      if (
        (this.unicodeDigits &&
          !/^[0-9a-fA-F]$/.test(String.fromCharCode(byte))) ||
        (this.escaped && byte !== 117 && escapedCodes[byte] === undefined)
      )
        this.mode = 'text'
      return
    }
    if (this.literal) {
      if (byte !== this.literal.charCodeAt(this.literalPosition))
        this.mode = 'text'
      return
    }
    if (this.number) {
      if (
        !digit(byte) &&
        ![43, 45, 46, 69, 101].includes(byte) &&
        !delimiter(byte)
      )
        this.mode = 'text'
      return
    }
    const top = this.stack.top
    let valid = !this.rootDone
    if (top === 'object-key' || top === 'object-key-or-end')
      valid = byte === 34 || (byte === 125 && top === 'object-key-or-end')
    else if (top === 'colon') valid = byte === 58
    else if (top === 'object-comma-or-end') valid = byte === 44 || byte === 125
    else if (top === 'array-comma-or-end') valid = byte === 44 || byte === 93
    else if (valid) {
      const literal = literalFor(byte)
      valid =
        [34, 91, 123].includes(byte) ||
        numberStart(bytes, position) ||
        (byte === 93 && top === 'array-value-or-end')
      if (literal)
        valid =
          [...literal].every(
            (character, index) =>
              bytes[position + index] === character.charCodeAt(0),
          ) &&
          (position + literal.length === bytes.length ||
            delimiter(bytes[position + literal.length]))
    }
    if (!valid) this.mode = 'text'
  }

  private completeValue(): void {
    if (this.stack.top?.startsWith('object-'))
      this.stack.top = 'object-comma-or-end'
    else if (this.stack.top?.startsWith('array-'))
      this.stack.top = 'array-comma-or-end'
    else this.rootDone = true
  }
}
