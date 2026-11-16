import type { ChatData } from '../chat/types'

const partKey = (key: string, index: number) =>
  `secrets:v1:blob:${key}:${index}`

/** Keep accepted command text and encrypted values below the KV value limit. */
export async function saveSecretRecord(
  data: ChatData,
  key: string,
  value: unknown,
) {
  const previous = (await data.get<number>(key)) ?? 0
  const text = JSON.stringify(value)
  const parts = text.match(/[\s\S]{1,16000}/gu) ?? ['']
  for (let index = 0; index < parts.length; index++)
    await data.put(partKey(key, index), parts[index])
  for (let index = parts.length; index < previous; index++)
    await data.delete(partKey(key, index))
  await data.put(key, parts.length)
}

export async function readSecretRecord(
  data: ChatData,
  key: string,
): Promise<unknown> {
  const count = await data.get<number>(key)
  if (count === undefined) return undefined
  const parts: string[] = []
  for (let index = 0; index < count; index++) {
    const part = await data.get<unknown>(partKey(key, index))
    if (typeof part !== 'string')
      throw new Error('The secret record is incomplete.')
    parts.push(part)
  }
  return JSON.parse(parts.join(''))
}

export async function deleteSecretRecord(data: ChatData, key: string) {
  const count = (await data.get<number>(key)) ?? 0
  for (let index = 0; index < count; index++)
    await data.delete(partKey(key, index))
  await data.delete(key)
}
