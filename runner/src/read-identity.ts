import { createHash } from 'node:crypto'
import { pipeline } from 'node:stream/promises'

import { FileAccessError, withReadFile } from './file-access'

/** Hash all readable bytes through the same verified descriptor as file reads. */
export async function readIdentity(
  root: string,
  path: string,
): Promise<string> {
  try {
    return await withReadFile(root, path, async (file) => {
      const hash = createHash('sha256')
      await pipeline(
        file.createReadStream({ autoClose: false }),
        async (chunks: AsyncIterable<Uint8Array>) => {
          for await (const chunk of chunks) hash.update(chunk)
        },
      )
      return hash.digest('hex')
    })
  } catch (error) {
    if (error instanceof FileAccessError) return 'unavailable'
    throw error
  }
}
