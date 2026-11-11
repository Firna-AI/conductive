import { createReadStream, createWriteStream } from 'node:fs'
import { open, rename, stat } from 'node:fs/promises'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { createZstdDecompress } from 'node:zlib'

import type { ImportContentObject } from '../../src/shared/conductor-import-manifest.ts'
import { readImportManifestEntry } from '../../src/shared/conductor-import-manifest-read.ts'
import { ImportStorage, readImportJson } from './import-storage'

export async function materializeImportObject(
  storage: ImportStorage,
  object: ImportContentObject,
  signal: AbortSignal,
) {
  const destination = storage.path('restored', object.id)
  await storage.mark(`object:${object.id}`, async () => {
    async function* parts() {
      let size = 0
      for (let index = 0; index < object.partCount; index++) {
        signal.throwIfAborted()
        const part = readImportManifestEntry(
          await readImportJson(
            storage.path('objectpart', `${object.id}:${index}`),
          ),
        )
        if (part.kind !== 'part' || part.index !== index)
          throw new Error('Invalid import object order.')
        const path = storage.path('bytes', part.part.id)
        if (
          (await readImportJson(storage.path('progress', part.part.id))) !==
            part.part.sizeBytes ||
          (await storage.hash(path)) !== part.part.sha256
        )
          throw new Error('The stored import part is incomplete or corrupt.')
        size += part.part.sizeBytes
        yield* createReadStream(path, { signal })
      }
      if (size !== object.sizeBytes)
        throw new Error('The import object size does not match.')
    }
    const temporary = `${destination}.next`
    const output = createWriteStream(temporary, {
      mode: 0o600,
      flags: 'w',
      signal,
    })
    let restoredBytes = 0
    const bounded = new Transform({
      transform(bytes: Buffer, _encoding, done) {
        restoredBytes += bytes.length
        if (restoredBytes > object.restoredBytes)
          done(new Error('The restored import size does not match.'))
        else done(null, bytes)
      },
    })
    if (object.encoding === 'zstd')
      await pipeline(
        Readable.from(parts()),
        createZstdDecompress(),
        bounded,
        output,
        { signal },
      )
    else await pipeline(Readable.from(parts()), bounded, output, { signal })
    if ((await stat(temporary)).size !== object.restoredBytes)
      throw new Error('The restored import size does not match.')
    const file = await open(temporary, 'r')
    try {
      await file.sync()
    } finally {
      await file.close()
    }
    await rename(temporary, destination)
  })
  return destination
}

export async function importObjectPath(
  storage: ImportStorage,
  id: string,
  signal: AbortSignal,
) {
  const object = readImportManifestEntry(
    await readImportJson(storage.path('object', id)),
  )
  if (object.kind !== 'object') throw new Error('Missing import object.')
  return materializeImportObject(storage, object, signal)
}
