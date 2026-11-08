import type { ChatData } from '../chat/types'

interface Parts {
  parts: number
}
const partKey = (key: string, part: number) => `devices:v1:blob:${key}:${part}`

/** Keep large allowed wire values below the durable KV value limit. */
export async function writeDeviceValue(
  data: ChatData,
  key: string,
  value: unknown,
): Promise<void> {
  const old = await data.get<Parts>(key)
  const text = JSON.stringify(value)
  const parts = text.match(/[\s\S]{1,16000}/gu) ?? ['']
  for (let part = 0; part < parts.length; part++)
    await data.put(partKey(key, part), parts[part])
  for (let part = parts.length; part < (old?.parts ?? 0); part++)
    await data.delete(partKey(key, part))
  await data.put(key, { parts: parts.length })
}

export async function readDeviceValue(
  data: ChatData,
  key: string,
): Promise<unknown> {
  const stored = await data.get<Parts>(key)
  if (!stored) return undefined
  const parts: string[] = []
  for (let part = 0; part < stored.parts; part++) {
    const value = await data.get<string>(partKey(key, part))
    if (value === undefined) throw new Error('A device record is incomplete.')
    parts.push(value)
  }
  return JSON.parse(parts.join(''))
}

export async function deleteDeviceValue(
  data: ChatData,
  key: string,
): Promise<void> {
  const stored = await data.get<Parts>(key)
  for (let part = 0; part < (stored?.parts ?? 0); part++)
    await data.delete(partKey(key, part))
  await data.delete(key)
}
