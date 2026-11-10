import type {
  ImportLfsObject,
  ImportLfsRequest,
} from '../../src/shared/conductor-import-lfs.ts'
import { readImportLfsObject } from '../../src/shared/conductor-import-lfs.ts'
import {
  importList,
  importObject,
} from '../../src/shared/conductor-import-values.ts'
import type { ImportFixture } from './service.test-support'

export const LFS_ENDPOINT =
  'https://github.com/example/repository.git/info/lfs/objects/batch'
export const LFS_OBJECTS: ImportLfsObject[] = [
  { oid: 'a'.repeat(64), sizeBytes: 123 },
  { oid: 'b'.repeat(64), sizeBytes: 0 },
  { oid: 'c'.repeat(64), sizeBytes: 456 },
]
export const LFS_DOWNLOAD =
  'https://private-download.example.test/object?secret=private-action-token'

export function advertised(object: ImportLfsObject) {
  return {
    oid: object.oid,
    size: object.sizeBytes,
    authenticated: true,
    actions: {
      download: {
        href: LFS_DOWNLOAD,
        header: { Authorization: 'Bearer private-action-token' },
        expires_in: 300,
      },
    },
  }
}

export function lfsResponse(
  objects: readonly unknown[],
  extra: Record<string, unknown> = {},
) {
  return Response.json(
    { transfer: 'basic', hash_algo: 'sha256', objects, ...extra },
    {
      headers: { 'Content-Type': 'application/vnd.git-lfs+json' },
    },
  )
}

export function repositoryFactsResponse() {
  return Response.json({
    data: {
      repository: {
        databaseId: 17,
        nameWithOwner: 'example/repository',
        ref: null,
        defaultBranchRef: null,
      },
    },
  })
}

export async function prepareLfs(
  fixture: ImportFixture,
): Promise<ImportLfsRequest> {
  fixture.dependencies.fetch = async () => repositoryFactsResponse()
  await fixture.control({ kind: 'reserve', row: fixture.source })
  const result = await fixture.control({
    kind: 'repository.facts',
    reservationId: 'reservation',
  })
  if (result.kind !== 'repository.facts')
    throw new Error('Missing repository facts.')
  return {
    kind: 'repository.lfs',
    reservationId: 'reservation',
    factsId: result.facts.id,
    objects: LFS_OBJECTS,
  }
}

export async function lfsCandidates(request: Request) {
  const body = importObject(await request.json())
  return importList(body.objects).map((value) => {
    const row = importObject(value)
    return readImportLfsObject({ oid: row.oid, sizeBytes: row.size })
  })
}

export function lfsObjects(count: number): ImportLfsObject[] {
  return Array.from({ length: count }, (_, index) => ({
    oid: index.toString(16).padStart(64, '0'),
    sizeBytes: index,
  }))
}
