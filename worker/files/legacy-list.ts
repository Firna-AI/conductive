import type { ListKind } from './bucket-layout'
import { invalidFileResponse } from './errors'
import { legacyChunkKeys, readStoredChunks } from './stored-chunks'
import type { FilesReader } from './storage'

type LegacyValue =
  | { type: 'field'; key: string; value: unknown }
  | { type: 'item'; value: unknown }

function whitespace(character: string): boolean {
  return (
    character === ' ' ||
    character === '\n' ||
    character === '\r' ||
    character === '\t'
  )
}

class JsonCursor {
  private readonly chunks: AsyncIterator<string>
  private chunk = ''
  private offset = 0

  constructor(chunks: AsyncIterator<string>) {
    this.chunks = chunks
  }

  private async hasCharacter(): Promise<boolean> {
    while (this.offset === this.chunk.length) {
      const next = await this.chunks.next()
      if (next.done) return false
      this.chunk = next.value
      this.offset = 0
    }
    return true
  }

  async peek(): Promise<string | undefined> {
    while (await this.hasCharacter()) {
      while (
        this.offset < this.chunk.length &&
        whitespace(this.chunk[this.offset])
      )
        this.offset++
      if (this.offset < this.chunk.length) return this.chunk[this.offset]
    }
    return undefined
  }

  async take(character: string): Promise<void> {
    if ((await this.peek()) !== character) throw invalidFileResponse()
    this.offset++
  }

  async value(): Promise<unknown> {
    await this.peek()
    const parts: string[] = []
    let depth = 0
    let quoted = false
    let escaped = false
    do {
      const start = this.offset
      for (; this.offset < this.chunk.length; this.offset++) {
        const character = this.chunk[this.offset]
        if (quoted) {
          if (escaped) escaped = false
          else if (character === '\\') escaped = true
          else if (character === '"') quoted = false
        } else if (character === '"') {
          quoted = true
        } else if (character === '{' || character === '[') {
          depth++
        } else if (character === '}' || character === ']') {
          if (depth === 0) break
          depth--
        } else if (depth === 0 && (character === ',' || character === ':')) {
          break
        }
      }
      parts.push(this.chunk.slice(start, this.offset))
      if (this.offset < this.chunk.length) break
    } while (await this.hasCharacter())
    try {
      return JSON.parse(parts.join(''))
    } catch {
      throw invalidFileResponse()
    }
  }
}

/** Read one JSON field or list item at a time, including across stored chunks. */
export async function* legacyListValues(
  storage: FilesReader,
  kind: ListKind,
  count: number,
): AsyncGenerator<LegacyValue> {
  const chunks = readStoredChunks(storage, legacyChunkKeys(kind, count))
  const cursor = new JsonCursor(chunks)
  const itemKey = kind === 'tree' ? 'entries' : 'files'
  let foundItems = false
  try {
    await cursor.take('{')
    while (true) {
      const key = await cursor.value()
      if (typeof key !== 'string') throw invalidFileResponse()
      await cursor.take(':')
      if (key === itemKey) {
        if (foundItems) throw invalidFileResponse()
        foundItems = true
        await cursor.take('[')
        if ((await cursor.peek()) !== ']') {
          while (true) {
            yield { type: 'item', value: await cursor.value() }
            if ((await cursor.peek()) === ']') break
            await cursor.take(',')
          }
        }
        await cursor.take(']')
      } else {
        yield { type: 'field', key, value: await cursor.value() }
      }
      if ((await cursor.peek()) === '}') break
      await cursor.take(',')
    }
    await cursor.take('}')
    if (!foundItems || (await cursor.peek()) !== undefined)
      throw invalidFileResponse()
  } finally {
    await chunks.return(undefined)
  }
}
