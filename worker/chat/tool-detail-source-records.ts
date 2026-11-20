import type { ChatData } from './types'
import { chatKey } from './storage-keys'

const SOURCE_PREFIX = chatKey('output-tool-source', '')
export const toolSourcePrefix = (streamId: string) =>
  `${chatKey('output-tool-source', streamId)}:`

/** Each record holds one bounded ciphertext, independent of source length. */
export class ToolDetailSourceRecords {
  private readonly data: ChatData

  constructor(data: ChatData) {
    this.data = data
  }

  async read(streamId: string, generation: number, index: number) {
    const value = await this.data.get<unknown>(
      `${toolSourcePrefix(streamId)}${generation}:${index}`,
    )
    if (typeof value !== 'string')
      throw new Error('Incomplete tool detail source')
    return value
  }

  save(
    streamId: string,
    generation: number,
    index: number,
    ciphertext: string,
  ) {
    return this.data.put(
      `${toolSourcePrefix(streamId)}${generation}:${index}`,
      ciphertext,
    )
  }

  async beginStream(streamId: string) {
    const keep = toolSourcePrefix(streamId)
    let startAfter: string | undefined
    for (;;) {
      const page = await this.data.list({
        prefix: SOURCE_PREFIX,
        startAfter,
        limit: 16,
      })
      if (!page.size) return
      for (const key of page.keys()) {
        startAfter = key
        if (!key.startsWith(keep)) await this.data.delete(key)
      }
    }
  }

  async clear(streamId: string, generation?: number) {
    const prefix =
      toolSourcePrefix(streamId) +
      (generation === undefined ? '' : `${generation}:`)
    let startAfter: string | undefined
    for (;;) {
      const page = await this.data.list({ prefix, startAfter, limit: 16 })
      if (!page.size) return
      for (const key of page.keys()) {
        await this.data.delete(key)
        startAfter = key
      }
    }
  }
}
