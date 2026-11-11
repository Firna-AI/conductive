import { constants } from 'node:fs'
import { open } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import { createZstdDecompress } from 'node:zlib'

export const readNativeLines = async (
  path: string,
  encoding: 'identity' | 'zstd',
  signal: AbortSignal,
  visit: (row: unknown, ordinal: number) => void | Promise<void>,
): Promise<number> => {
  signal.throwIfAborted()
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW)
  const input = file.createReadStream({ signal })
  let restoredBytes = 0
  const consume = async (source: AsyncIterable<Uint8Array>) => {
    const decoder = new TextDecoder('utf-8', { fatal: true })
    const fragments: string[] = []
    let ordinal = 0
    const line = async (text: string) => {
      signal.throwIfAborted()
      ordinal += 1
      if (text.trim().length === 0) return
      let row: unknown
      try {
        row = JSON.parse(text)
      } catch {
        throw new Error(
          `The native history has invalid JSON at line ${ordinal}.`,
        )
      }
      await visit(row, ordinal)
    }
    for await (const bytes of source) {
      signal.throwIfAborted()
      restoredBytes += bytes.byteLength
      const text = decoder.decode(bytes, { stream: true })
      let start = 0
      for (
        let end = text.indexOf('\n');
        end !== -1;
        end = text.indexOf('\n', start)
      ) {
        fragments.push(text.slice(start, end))
        await line(fragments.join(''))
        fragments.length = 0
        start = end + 1
      }
      fragments.push(text.slice(start))
    }
    fragments.push(decoder.decode())
    const remaining = fragments.join('')
    if (remaining.length > 0) await line(remaining)
  }
  try {
    if (encoding === 'zstd') {
      await pipeline(input, createZstdDecompress(), consume, { signal })
    } else {
      await pipeline(input, consume, { signal })
    }
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      if (error.code === 'ERR_ENCODING_INVALID_ENCODED_DATA') {
        throw new Error('The native history has invalid UTF-8.', {
          cause: error,
        })
      }
      if (
        typeof error.code === 'string' &&
        error.code.startsWith('ZSTD_error_')
      ) {
        throw new Error('The compressed native history could not be read.', {
          cause: error,
        })
      }
    }
    throw error
  } finally {
    await file.close()
  }
  return restoredBytes
}
