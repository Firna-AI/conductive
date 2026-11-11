import { previewNumber } from '../names.ts'
import type { RelayEnv } from './env.ts'

export async function previewNumbers(
  registry: RelayEnv['PREVIEWS'],
): Promise<number[]> {
  const numbers = new Set<number>()
  let cursor: string | undefined
  for (;;) {
    const page = await registry.list({
      prefix: 'pr-',
      limit: 1000,
      ...(cursor ? { cursor } : {}),
    })
    for (const key of page.keys) {
      const number = previewNumber(key.name, 'pr-')
      if (number !== null) numbers.add(number)
    }
    if (page.list_complete) return [...numbers].sort((a, b) => a - b)
    if (!page.cursor || page.cursor === cursor)
      throw new Error('The preview registry returned an invalid cursor.')
    cursor = page.cursor
  }
}
