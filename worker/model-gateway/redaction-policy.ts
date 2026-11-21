import { jsonCharacter, wordCode } from './redaction-characters'
import { RedactionContext } from './redaction-context'

const encoder = new TextEncoder()
const booleanHeaders = new Set([
  'x-should-retry',
  'x-reasoning-included',
  'x-codex-safety-buffering-enabled',
  'x-codex-safety-buffering-faster-model',
])
const token = "[\\w!#$%&'*+.^`|~-]+"
const quotedString = String.raw`"(?:[^"\\]|\\.)*"`
const parameter = `${token}=(?:${token}|${quotedString})`
// Whitespace belongs to a following parameter or the next semicolon.
const contentType = new RegExp(
  String.raw`^${token}/${token}(?:\s*;(?:\s*${parameter})?)*$`,
)

function patterns(values: readonly string[]) {
  return [
    ...new Set(
      values.flatMap((value) => [value, JSON.stringify(value).slice(1, -1)]),
    ),
  ]
    .filter(Boolean)
    .map((value) => encoder.encode(value))
    .sort((a, b) => b.length - a.length)
}

function matchingLength(
  patterns: readonly Uint8Array[],
  bytes: Uint8Array,
  position: number,
) {
  return (
    patterns.find(
      (pattern) =>
        position + pattern.length <= bytes.length &&
        pattern.every((value, index) => value === bytes[position + index]),
    )?.length ?? 0
  )
}

/** One policy serves response headers and streamed error bytes. Address forms stay unconditional. */
export class RedactionPolicy {
  private readonly unconditional: Uint8Array[]
  private readonly shortKeys: {
    value: string
    patterns: Uint8Array[]
    firstWord: boolean
    lastWord: boolean
  }[]
  readonly carryBytes: number

  constructor(keys: readonly string[], addressForms: readonly string[] = []) {
    this.unconditional = patterns([
      ...keys.filter((key) => key.length >= 12),
      ...addressForms,
    ])
    this.shortKeys = [...new Set(keys)]
      .filter((key) => key.length > 0 && key.length < 12)
      .map((value) => ({
        value,
        patterns: patterns([value]),
        firstWord: wordCode(value.codePointAt(0)),
        lastWord: wordCode(Array.from(value).at(-1)?.codePointAt(0)),
      }))
    this.carryBytes = Math.max(
      0,
      ...this.unconditional.map((pattern) => pattern.length - 1),
      ...this.shortKeys.map((key) =>
        Math.max(
          key.value.length * 6 + 5,
          ...key.patterns.map((pattern) => pattern.length + 5),
        ),
      ),
    )
  }

  context(header?: { name: string; value: string }): RedactionContext | null {
    if (
      !this.shortKeys.length ||
      (header && this.preservesHeader(header.name, header.value))
    )
      return null
    if (!header) return new RedactionContext('body')
    if (/^\s*[[{]/.test(header.value)) {
      try {
        JSON.parse(header.value)
        return new RedactionContext('json')
      } catch {
        return new RedactionContext('text')
      }
    }
    return new RedactionContext('text')
  }

  match(
    bytes: Uint8Array,
    position: number,
    context: RedactionContext | null,
  ): number {
    let length = matchingLength(this.unconditional, bytes, position)
    if (!context) return length
    const mode = context.shortMode(bytes, position)
    if (mode === 'protected') return length
    for (const key of this.shortKeys) {
      if (key.firstWord && context.previousWord) continue
      let end = position
      if (mode === 'text') end += matchingLength(key.patterns, bytes, position)
      else {
        let matched = 0
        while (matched < key.value.length) {
          const character = jsonCharacter(bytes, end)
          if (!character || !key.value.startsWith(character.value, matched))
            break
          matched += character.value.length
          end = character.end
        }
        if (matched !== key.value.length) continue
      }
      if (end === position) continue
      const next =
        mode === 'string'
          ? jsonCharacter(bytes, end)?.value.codePointAt(0)
          : bytes[end]
      if (!key.lastWord || !wordCode(next))
        length = Math.max(length, end - position)
    }
    return length
  }

  private preservesHeader(name: string, value: string): boolean {
    if (name === 'content-type') return contentType.test(value)
    if (booleanHeaders.has(name)) return /^(true|false)$/.test(value)
    if (name === 'retry-after')
      return /^(?:\d+|(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT)$/.test(
        value,
      )
    if (
      name.startsWith('anthropic-ratelimit-') ||
      name.startsWith('x-ratelimit-')
    )
      return /^(?:\d+(?:\.\d+)?|(?:\d+(?:\.\d+)?(?:ms|s|m|h|d))+|\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)$/.test(
        value,
      )
    return false
  }
}
