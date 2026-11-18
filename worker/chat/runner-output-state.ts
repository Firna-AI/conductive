import { RUNNER_EVENT_MAX_BYTES } from '../../src/shared/runner'
import type { TurnEventContext } from '../../src/shared/generated/TurnEventContext'
import { isRecord } from '../http'
import type { ChatData } from './types'
import { chatKey } from './storage-keys'
import type { AppEnv } from '../env'
import { maskOpenToolDetails } from './tool-detail-cleanup'
import { ToolDetailSourceRecords } from './tool-detail-source-records'

const CHUNK_CHARACTERS = RUNNER_EVENT_MAX_BYTES / 16
const CONTEXT_KEY = chatKey('output-context', 'workspace')
const STREAM_PREFIX = chatKey('output-filter', '')
const TOOL_PREFIX = chatKey('output-tool', '')

/** Only encrypted filter state enters these transaction-owned records. */
export class RunnerOutputState {
  private readonly data: ChatData
  readonly toolSources: ToolDetailSourceRecords

  constructor(data: ChatData) {
    this.data = data
    this.toolSources = new ToolDetailSourceRecords(data)
  }

  async read(streamId: string): Promise<string | undefined> {
    return this.readAt(chatKey('output-filter', streamId))
  }

  readContexts(): Promise<string | undefined> {
    return this.readAt(CONTEXT_KEY)
  }

  saveContexts(ciphertext: string | undefined): Promise<void> {
    return this.saveAt(CONTEXT_KEY, ciphertext)
  }

  async streams(): Promise<string[]> {
    return this.streamsAt(STREAM_PREFIX)
  }

  toolStreams(): Promise<string[]> {
    return this.streamsAt(TOOL_PREFIX)
  }

  maskTools(env: AppEnv, workspaceId: string, active: ReadonlySet<string>) {
    return maskOpenToolDetails(env, { output: this, workspaceId }, active)
  }

  private async streamsAt(prefix: string): Promise<string[]> {
    const streams: string[] = []
    let startAfter: string | undefined
    while (true) {
      const entries = await this.data.list<unknown>({
        prefix,
        limit: 16,
        ...(startAfter === undefined ? {} : { startAfter }),
      })
      if (!entries.size) return streams
      for (const [key, value] of entries) {
        startAfter = key
        if (typeof value === 'number')
          streams.push(decodeURIComponent(key.slice(prefix.length)))
      }
    }
  }

  save(streamId: string, ciphertext: string | undefined): Promise<void> {
    return this.saveAt(chatKey('output-filter', streamId), ciphertext)
  }

  readTool(streamId: string): Promise<string | undefined> {
    return this.readAt(chatKey('output-tool', streamId))
  }

  async toolContext(streamId: string): Promise<TurnEventContext | undefined> {
    const value = await this.data.get<unknown>(
      `${chatKey('output-tool', streamId)}:identity`,
    )
    if (
      !isRecord(value) ||
      typeof value.sessionId !== 'string' ||
      typeof value.turnId !== 'string'
    )
      return undefined
    return { sessionId: value.sessionId, turnId: value.turnId }
  }

  async saveTool(
    streamId: string,
    ciphertext: string | undefined,
    context?: TurnEventContext,
  ): Promise<void> {
    const key = chatKey('output-tool', streamId)
    await this.saveAt(key, ciphertext)
    if (ciphertext && context) await this.data.put(`${key}:identity`, context)
    else await this.data.delete(`${key}:identity`)
    if (!ciphertext) await this.toolSources.clear(streamId)
  }

  async beginToolStream(streamId: string): Promise<void> {
    const keep = chatKey('output-tool', streamId)
    let startAfter: string | undefined
    while (true) {
      const entries = await this.data.list<unknown>({
        prefix: TOOL_PREFIX,
        limit: 16,
        ...(startAfter === undefined ? {} : { startAfter }),
      })
      if (!entries.size) break
      for (const [key, value] of entries) {
        startAfter = key
        if (typeof value === 'number' && key !== keep) {
          await this.saveTool(
            decodeURIComponent(key.slice(TOOL_PREFIX.length)),
            undefined,
          )
        }
      }
    }
    await this.toolSources.beginStream(streamId)
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
