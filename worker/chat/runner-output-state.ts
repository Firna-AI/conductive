import { RUNNER_EVENT_MAX_BYTES } from '../../src/shared/runner'
import type { ChatData } from './types'
import { chatKey } from './storage-keys'

const CHUNK_CHARACTERS = RUNNER_EVENT_MAX_BYTES / 16
const CONTEXT_KEY = chatKey('output-context', 'workspace')
const STREAM_PREFIX = chatKey('output-filter', '')

/** Only encrypted filter state enters these transaction-owned records. */
export class RunnerOutputState {
  private readonly data: ChatData

  constructor(data: ChatData) {
    this.data = data
  }

  async read(streamId: string): Promise<string | undefined> {
    return this.readAt(chatKey('output-filter', streamId))
  }

  readContexts(): Promise<string | undefined> {
    return this.readAt(CONTEXT_KEY)
  }

  saveContexts(ciphertext: string): Promise<void> {
    return this.saveAt(CONTEXT_KEY, ciphertext)
  }

  async streams(): Promise<string[]> {
    const streams: string[] = []
    let startAfter: string | undefined
    while (true) {
      const entries = await this.data.list<unknown>({
        prefix: STREAM_PREFIX,
        ...(startAfter === undefined ? {} : { startAfter }),
      })
      if (!entries.size) return streams
      for (const [key, value] of entries) {
        startAfter = key
        if (typeof value === 'number')
          streams.push(decodeURIComponent(key.slice(STREAM_PREFIX.length)))
      }
    }
  }

  save(streamId: string, ciphertext: string | undefined): Promise<void> {
    return this.saveAt(chatKey('output-filter', streamId), ciphertext)
  }

  private async readAt(key: string): Promise<string | undefined> {
    const count = (await this.data.get<number>(key)) ?? 0
    if (!count) return undefined
    const parts: string[] = []
    for (let index = 0; index < count; index++) {
      const part = await this.data.get<unknown>(`${key}:${index}`)
      if (typeof part !== 'string')
        throw new Error('Incomplete output filter state')
      parts.push(part)
    }
    return parts.join('')
  }

  private async saveAt(
    key: string,
    ciphertext: string | undefined,
  ): Promise<void> {
    const previous = (await this.data.get<number>(key)) ?? 0
    const text = ciphertext ?? ''
    const count = ciphertext
      ? Math.ceil(ciphertext.length / CHUNK_CHARACTERS)
      : 0
    for (let index = 0; index < count; index++)
      await this.data.put(
        `${key}:${index}`,
        text.slice(index * CHUNK_CHARACTERS, (index + 1) * CHUNK_CHARACTERS),
      )
    for (let index = count; index < previous; index++)
      await this.data.delete(`${key}:${index}`)
    if (count) await this.data.put(key, count)
    else await this.data.delete(key)
  }
}
