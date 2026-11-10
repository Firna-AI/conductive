import { refuseCodexBody } from './errors'
import { JsonStack } from './json-stack'
import { JsonTokens, type JsonToken } from './json-tokens'

const DECODE_BYTES = 65_536

/** Validate incrementally without retaining keys, values, or body chunks. */
export class CodexBodyScanner {
  private readonly decoder = new TextDecoder('utf-8', {
    fatal: true,
    ignoreBOM: true,
  })
  private readonly tokens = new JsonTokens((token) => this.accept(token))
  private readonly states = new JsonStack()
  private started = false
  private background = false

  write(chunk: Uint8Array): void {
    for (let offset = 0; offset < chunk.byteLength; offset += DECODE_BYTES)
      this.tokens.write(
        this.decode(chunk.subarray(offset, offset + DECODE_BYTES)),
      )
  }

  finish(): void {
    this.tokens.write(this.decode())
    this.tokens.finish()
    if (!this.started || this.states.length !== 0) refuseCodexBody()
  }

  private decode(chunk?: Uint8Array): string {
    try {
      return this.decoder.decode(chunk, { stream: chunk !== undefined })
    } catch {
      return refuseCodexBody()
    }
  }

  private accept(token: JsonToken): void {
    if (!this.started) {
      if (token !== '{') refuseCodexBody()
      this.started = true
      this.states.push('object-key-or-end')
      return
    }
    const index = this.states.length - 1
    switch (this.states.top) {
      case 'object-key-or-end':
      case 'object-key':
        if (this.states.top === 'object-key-or-end' && token === '}') {
          this.states.pop()
          return
        }
        if (token !== 'string' && token !== 'background') refuseCodexBody()
        if (index === 0) this.background = token === 'background'
        this.states.top = 'colon'
        return
      case 'colon':
        if (token !== ':') refuseCodexBody()
        this.states.top = 'object-value'
        return
      case 'object-comma-or-end':
        if (token === '}') this.states.pop()
        else if (token === ',') this.states.top = 'object-key'
        else refuseCodexBody()
        return
      case 'array-comma-or-end':
        if (token === ']') this.states.pop()
        else if (token === ',') this.states.top = 'array-value'
        else refuseCodexBody()
        return
      case 'array-value-or-end':
        if (token === ']') {
          this.states.pop()
          return
        }
        break
      case 'array-value':
        break
      case 'object-value':
        if (index === 0 && this.background && token !== 'false')
          refuseCodexBody()
        break
      default:
        refuseCodexBody()
    }
    this.states.top =
      this.states.top === 'object-value'
        ? 'object-comma-or-end'
        : 'array-comma-or-end'
    if (token === '{') this.states.push('object-key-or-end')
    else if (token === '[') this.states.push('array-value-or-end')
    else if (
      !['string', 'background', 'number', 'true', 'false', 'null'].includes(
        token,
      )
    )
      refuseCodexBody()
  }
}
