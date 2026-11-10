import {
  ImportStorageError,
  type ConductorImportStorage,
  type ImportObjectGroup,
  type ImportPart,
  type ImportStorageScope,
  type SealedImportPart,
} from '../../src/shared/conductor-import-storage'
import type { AppEnv } from '../env'
import { randomToken } from '../security/crypto'
import { documentStream } from './document-stream'
import {
  checkedPart,
  checkScope,
  importPrefix,
  sealedKey,
  uploadKey,
} from './object-keys'
import { readR2Part } from './r2-bytes'
import { signR2Upload } from './r2-signing'

/** Limits bound one transport operation, never a package or document total. */
export function createR2ImportStorage(
  env: AppEnv,
  inputScope: ImportStorageScope,
  limits: { maxPartBytes: number; maxReadBytes: number },
  dependencies = { now: Date.now, newId: randomToken },
): ConductorImportStorage {
  const bucket = env.CHAT_ATTACHMENTS
  if (!bucket) throw new ImportStorageError('not_configured')
  if (
    !Number.isSafeInteger(limits.maxPartBytes) ||
    limits.maxPartBytes < 1 ||
    !Number.isSafeInteger(limits.maxReadBytes) ||
    limits.maxReadBytes < 1
  )
    throw new ImportStorageError('invalid_part')
  const scope = { ...inputScope }
  const { maxPartBytes, maxReadBytes } = limits
  const checked = (sealed: SealedImportPart): ImportPart => {
    checkScope(scope, sealed.scope)
    return checkedPart(sealed.part, maxPartBytes)
  }
  const readSealed = (sealed: SealedImportPart, signal: AbortSignal) => {
    const part = checked(sealed)
    return readR2Part(bucket, sealedKey(scope, part), part, undefined, signal)
  }
  return {
    async createUploadTarget(input) {
      const part = checkedPart(input, maxPartBytes)
      const identity = {
        scope: { ...scope },
        part,
        uploadId: dependencies.newId(),
      }
      const signed = await signR2Upload(
        env,
        uploadKey(identity),
        part.sizeBytes,
        part.sha256,
        dependencies.now(),
      )
      return { method: 'PUT', ...signed, identity }
    },
    async sealPart(input) {
      checkScope(scope, input.scope)
      const part = checkedPart(input.part, maxPartBytes)
      const uploadId = input.uploadId
      const sealed = { scope: { ...scope }, part }
      const key = sealedKey(scope, part)
      try {
        await readR2Part(bucket, key, part)
        return sealed
      } catch (error) {
        if (
          error instanceof ImportStorageError &&
          error.code === 'part_mismatch'
        )
          return null
        if (
          !(error instanceof ImportStorageError) ||
          error.code !== 'part_missing'
        )
          throw error
      }
      try {
        let bytes: Uint8Array<ArrayBuffer> | null = await readR2Part(
          bucket,
          uploadKey({ scope, part, uploadId }),
          part,
        )
        const written = await bucket.put(key, bytes, {
          onlyIf: { etagDoesNotMatch: '*' },
          sha256: part.sha256,
        })
        bytes = null
        // Another seal may win the atomic write. Read its bytes before trusting it.
        if (!written) await readR2Part(bucket, key, part)
        return sealed
      } catch (error) {
        if (
          error instanceof ImportStorageError &&
          ['part_missing', 'part_mismatch'].includes(error.code)
        )
          return null
        throw error
      }
    },
    async readPart(sealed, range, signal) {
      const part = checked(sealed)
      const { offset, length } = range
      if (
        !Number.isSafeInteger(offset) ||
        !Number.isSafeInteger(length) ||
        offset < 0 ||
        length < 0 ||
        length > maxReadBytes ||
        offset > part.sizeBytes ||
        length > part.sizeBytes - offset
      )
        throw new ImportStorageError('invalid_range')
      if (length === 0 && part.sizeBytes !== 0) {
        if (signal?.aborted) throw new ImportStorageError('read_cancelled')
        const object = await bucket.head(sealedKey(scope, part))
        if (signal?.aborted) throw new ImportStorageError('read_cancelled')
        if (!object) throw new ImportStorageError('part_missing')
        if (object.size !== part.sizeBytes)
          throw new ImportStorageError('part_mismatch')
        return new Uint8Array()
      }
      return readR2Part(
        bucket,
        sealedKey(scope, part),
        part,
        part.sizeBytes === 0 ? undefined : { offset, length },
        signal,
      )
    },
    streamDocument(parts) {
      return documentStream(parts, readSealed)
    },
    async deleteObjects(group?: ImportObjectGroup) {
      if (group !== undefined && !['work', 'document'].includes(group))
        throw new ImportStorageError('invalid_part')
      const prefix = importPrefix(scope, group)
      let cursor: string | undefined
      do {
        const page = await bucket.list({ prefix, cursor, limit: 1000 })
        if (page.objects.length)
          await bucket.delete(page.objects.map((object) => object.key))
        cursor = page.truncated ? page.cursor : undefined
      } while (cursor)
    },
  }
}
