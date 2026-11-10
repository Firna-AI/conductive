import type { AppEnv } from '../env'
import {
  storeAttachment,
  type AttachmentStorageInput,
} from '../chat/attachment-storage'
import { readAttachment } from '../chat/attachment-data'
import { attachmentBucket } from '../chat/attachment-record'

export interface NativeByteChunk {
  sizeBytes: number
  fill: number
}

export function nativeAttachmentControls(env: AppEnv, now: () => number) {
  return {
    attachmentByteSample: async (id: string, positions: readonly number[]) => {
      const record = await readAttachment(env.DB, id)
      if (!record) throw new Error('The attachment record is missing.')
      const object = await attachmentBucket(env).get(record.objectKey)
      if (!object) throw new Error('The attachment object is missing.')
      const bytes = new Uint8Array(await object.arrayBuffer())
      return {
        byteLength: bytes.byteLength,
        samples: positions.map((at) => bytes[at]),
      }
    },
    storeAttachmentChunks: (
      input: AttachmentStorageInput,
      id: string,
      chunks: readonly NativeByteChunk[],
    ) => {
      const source = new ReadableStream<Uint8Array>({
        start(controller) {
          for (const chunk of chunks)
            controller.enqueue(new Uint8Array(chunk.sizeBytes).fill(chunk.fill))
          controller.close()
        },
      })
      return storeAttachment(env, input, source, { now, newId: () => id })
    },
  }
}
