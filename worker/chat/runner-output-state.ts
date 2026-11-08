import { RUNNER_EVENT_MAX_BYTES } from '../../src/shared/runner'
import type { ChatData } from './types'
import { chatKey } from './storage-keys'

const CHUNK_CHARACTERS = RUNNER_EVENT_MAX_BYTES / 16

/** Only encrypted filter state enters these transaction-owned records. */
export class RunnerOutputState {
  private readonly data: ChatData

  constructor(data: ChatData) {
    this.data = data
  }

  async read(streamId: string): Promise<string | undefined> {
    const key = chatKey('output-filter', streamId)
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

  async save(streamId: string, ciphertext: string | undefined): Promise<void> {
    const key = chatKey('output-filter', streamId)
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
