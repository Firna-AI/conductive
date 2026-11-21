import {
  serviceCounter,
  serviceRecord,
  serviceString,
} from '../../src/shared/service-inputs'
import type { ChatData, ChatStorage } from '../chat/types'

export const SERVICE_ROOT = 'services:v1:'
const chunkKey = (key: string, part: number) => `${key}:part:${part}`

function partCount(value: unknown): number {
  return value === undefined ? 0 : serviceCounter(serviceRecord(value).parts)
}

async function readServiceValue(data: ChatData, key: string): Promise<unknown> {
  const stored: unknown = await data.get(key)
  if (stored === undefined) return undefined
  const parts: string[] = []
  for (let part = 0; part < partCount(stored); part++)
    parts.push(serviceString(await data.get(chunkKey(key, part))))
  const value: unknown = JSON.parse(parts.join(''))
  return value
}

async function writeServiceValue(
  data: ChatData,
  key: string,
  value: unknown,
): Promise<void> {
  const old = partCount(await data.get(key))
  const text = JSON.stringify(value)
  const parts = Math.ceil(text.length / 16_000)
  for (let part = 0; part < parts; part++)
    await data.put(
      chunkKey(key, part),
      text.slice(part * 16_000, (part + 1) * 16_000),
    )
  for (let part = parts; part < old; part++)
    await data.delete(chunkKey(key, part))
  await data.put(key, { parts })
}

async function deleteServiceValue(data: ChatData, key: string): Promise<void> {
  const count = partCount(await data.get(key))
  for (let part = 0; part < count; part++)
    await data.delete(chunkKey(key, part))
  await data.delete(key)
}

export class ServiceValues {
  readonly storage: ChatStorage

  constructor(storage: ChatStorage) {
    this.storage = storage
  }

  read(key: string): Promise<unknown> {
    return readServiceValue(this.storage, key)
  }

  write(key: string, value: unknown): Promise<void> {
    return this.storage.transaction((data) =>
      writeServiceValue(data, key, value),
    )
  }

  delete(key: string): Promise<void> {
    return this.storage.transaction((data) => deleteServiceValue(data, key))
  }

  async keys(prefix: string): Promise<string[]> {
    return [...(await this.storage.list<unknown>({ prefix })).keys()].filter(
      (key) => !key.includes(':part:'),
    )
  }
}
