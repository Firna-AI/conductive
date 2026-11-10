import { createHash } from 'node:crypto'
import type {
  ConductorImportStorage,
  ImportObjectGroup,
  ImportPart,
  ImportStorageScope,
  ImportUploadTarget,
  SealedImportPart,
} from '../../src/shared/conductor-import-storage'
import type { TestHarness } from '../test-support/harness'
import { importPrefix, sealedKey, uploadKey } from './object-keys'
import { createR2ImportStorage } from './r2-storage'

export const SCOPE: ImportStorageScope = {
  orgId: 'org-1',
  reservationId: 'reservation-1',
}
const NOW = Date.parse('2026-11-10T12:34:56.789Z')
export const HELLO = new TextEncoder().encode('hello')
export const HELLO_PART: ImportPart = {
  group: 'work',
  id: 'part-1',
  sizeBytes: 5,
  sha256: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
}

export function partFor(
  bytes: Uint8Array,
  id: string,
  group: ImportObjectGroup = 'work',
): ImportPart {
  return {
    id,
    group,
    sizeBytes: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  }
}

export function storageFixture(
  harness: TestHarness,
  options: {
    scope?: ImportStorageScope
    bucket?: R2Bucket
    maxPartBytes?: number
    maxReadBytes?: number
  } = {},
) {
  const bucket = options.bucket ?? harness.env.CHAT_ATTACHMENTS
  if (!bucket) throw new Error('Missing local R2 binding')
  let sequence = 0
  const env = {
    ...harness.env,
    CHAT_ATTACHMENTS: bucket,
    CHAT_ATTACHMENTS_S3_BUCKET_URL:
      'https://example.r2.cloudflarestorage.com/private-bucket',
    CHAT_ATTACHMENTS_ACCESS_KEY_ID: 'example-access-key',
    CHAT_ATTACHMENTS_SECRET_ACCESS_KEY: 'example-secret-key',
  }
  const storage: ConductorImportStorage = createR2ImportStorage(
    env,
    options.scope ?? SCOPE,
    {
      maxPartBytes: options.maxPartBytes ?? 8,
      maxReadBytes: options.maxReadBytes ?? 3,
    },
    { now: () => NOW, newId: () => `upload-${++sequence}` },
  )
  const upload = async (part: ImportPart, bytes: Uint8Array) => {
    const target = await storage.createUploadTarget(part)
    // Local R2 has no S3 listener. This writes actual objects, not signed PUTs.
    await bucket.put(uploadKey(target.identity), bytes, {
      customMetadata: {
        sha256: part.sha256,
        sizeBytes: String(part.sizeBytes),
      },
    })
    return target
  }
  const seal = async (part: ImportPart, bytes: Uint8Array) => {
    const target = await upload(part, bytes)
    const result = await storage.sealPart(target.identity)
    if (!result) throw new Error('Fixture part failed verification')
    return result
  }
  return { bucket, env, storage, upload, seal }
}

export function temporaryKey(target: ImportUploadTarget) {
  return uploadKey(target.identity)
}

export function immutableKey(sealed: SealedImportPart) {
  return sealedKey(sealed.scope, sealed.part)
}

export async function keysForScope(
  bucket: R2Bucket,
  scope: ImportStorageScope,
) {
  return (await bucket.list({ prefix: importPrefix(scope) })).objects.map(
    (object) => object.key,
  )
}

export function held<T>() {
  let resolve: (value: T) => void = () => undefined
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

export function localBucket(harness: TestHarness): R2Bucket {
  const bucket = harness.env.CHAT_ATTACHMENTS
  if (!bucket) throw new Error('Missing local R2 binding')
  return bucket
}

export function observeGets(
  bucket: R2Bucket,
  get: (
    key: string,
    read: () => Promise<R2ObjectBody | null>,
  ) => Promise<R2ObjectBody | null>,
): R2Bucket {
  return new Proxy(bucket, {
    get(target, property) {
      if (property === 'get')
        return (key: string, options?: R2GetOptions) =>
          get(key, () => target.get(key, options))
      return Reflect.get(target, property, target)
    },
  })
}

export function withBody(
  object: R2ObjectBody,
  body: ReadableStream<Uint8Array>,
  onAccess: () => void = () => undefined,
): R2ObjectBody {
  return new Proxy(object, {
    get(target, property) {
      if (property === 'body') {
        onAccess()
        return body
      }
      return Reflect.get(target, property, target)
    },
  })
}
