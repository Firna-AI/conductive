import { refuseCodexBody } from './errors'

export type JsonToken =
  | '{'
  | '}'
  | '['
  | ']'
  | ':'
  | ','
  | 'string'
  | 'background'
  | 'number'
  | 'true'
  | 'false'
  | 'null'

type Mode = 'idle' | 'string' | 'escape' | 'unicode' | 'literal' | 'number'
type NumberState =
  | 'minus'
  | 'zero'
  | 'integer'
  | 'point'
  | 'fraction'
  | 'exponent'
  | 'sign'
  | 'power'
const escapes: Readonly<Record<string, number>> = {
  '"': 34,
  '\\': 92,
  '/': 47,
  b: 8,
  f: 12,
  n: 10,
  r: 13,
  t: 9,
}

/** Tokens keep only a number state, an escape, or a fixed-length key match. */
export class JsonTokens {
  private mode: Mode = 'idle'
  private number: NumberState = 'zero'
  private literal: 'true' | 'false' | 'null' = 'null'
  private position = 0
  private keyMatch = 0
  private unicode = 0
  private digits = 0
  private readonly emit: (token: JsonToken) => void

  constructor(emit: (token: JsonToken) => void) {
    this.emit = emit
  }

  write(text: string): void {
    for (const character of text) this.read(character)
  }

  finish(): void {
    if (this.mode === 'number') this.endNumber()
    if (this.mode !== 'idle') refuseCodexBody()
  }

  private match(code: number): void {
    if (this.keyMatch < 0) return
    if ('background'.charCodeAt(this.keyMatch) === code) this.keyMatch++
    else this.keyMatch = -1
  }

  private read(character: string): void {
    if (this.mode === 'string') {
      if (character === '"') {
        this.mode = 'idle'
        this.emit(this.keyMatch === 10 ? 'background' : 'string')
      } else if (character === '\\') this.mode = 'escape'
      else {
        const code = character.charCodeAt(0)
        if (code < 32) refuseCodexBody()
        this.match(code)
      }
      return
    }
    if (this.mode === 'escape') {
      if (character === 'u') {
        this.mode = 'unicode'
        this.unicode = 0
        this.digits = 0
      } else {
        const code = escapes[character]
        if (code === undefined) refuseCodexBody()
        this.match(code)
        this.mode = 'string'
      }
      return
    }
    if (this.mode === 'unicode') {
      if (!/^[0-9a-fA-F]$/.test(character)) refuseCodexBody()
      this.unicode = this.unicode * 16 + Number.parseInt(character, 16)
      if (++this.digits === 4) {
        this.match(this.unicode)
        this.mode = 'string'
      }
      return
    }
    if (this.mode === 'literal') {
      if (character !== this.literal[this.position++]) refuseCodexBody()
      if (this.position === this.literal.length) {
        this.mode = 'idle'
        this.emit(this.literal)
      }
      return
    }
    if (this.mode === 'number') {
      if (this.readNumber(character)) return
      this.endNumber()
    }
    switch (character) {
      case ' ':
      case '\t':
      case '\n':
      case '\r':
        return
      case '{':
      case '}':
      case '[':
      case ']':
      case ':':
      case ',':
        this.emit(character)
        return
      case '"':
        this.mode = 'string'
        this.keyMatch = 0
        return
      case 't':
      case 'f':
      case 'n':
        this.literal =
          character === 't' ? 'true' : character === 'f' ? 'false' : 'null'
        this.position = 1
        this.mode = 'literal'
        return
      default:
        if (character === '-' || (character >= '0' && character <= '9')) {
          this.mode = 'number'
          this.number =
            character === '-' ? 'minus' : character === '0' ? 'zero' : 'integer'
          return
        }
        refuseCodexBody()
    }
  }

  private readNumber(character: string): boolean {
    const digit = character >= '0' && character <= '9'
    switch (this.number) {
      case 'minus':
        if (!digit) refuseCodexBody()
        this.number = character === '0' ? 'zero' : 'integer'
        return true
      case 'zero':
      case 'integer':
        if (digit) {
          if (this.number === 'zero') refuseCodexBody()
          return true
        }
        if (character === '.') {
          this.number = 'point'
          return true
        }
        break
      case 'point':
      case 'sign':
        if (!digit) refuseCodexBody()
        this.number = this.number === 'point' ? 'fraction' : 'power'
        return true
      case 'fraction':
      case 'power':
        if (digit) return true
        break
      case 'exponent':
        if (character === '+' || character === '-') this.number = 'sign'
        else if (digit) this.number = 'power'
        else refuseCodexBody()
        return true
    }
    if ((character === 'e' || character === 'E') && this.number !== 'power') {
      this.number = 'exponent'
      return true
    }
    return false
  }

  private endNumber(): void {
    if (!['zero', 'integer', 'fraction', 'power'].includes(this.number))
      refuseCodexBody()
    this.mode = 'idle'
    this.emit('number')
  }
}
