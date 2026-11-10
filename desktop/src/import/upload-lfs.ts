import type { ImportLfsObject } from '../../../src/shared/conductor-import-lfs.ts'
import type { ImportRepositoryFacts } from '../../../src/shared/conductor-import-operation.ts'
import type { ImportUploadDependencies } from './upload-context.ts'
import { LocalImportError } from './types.ts'
import type { ImportJobResults } from './types.ts'

const key = (object: ImportLfsObject) =>
  JSON.stringify([object.oid, object.sizeBytes])

/** Availability is private and bound to the same captured repository facts. */
export async function prepareImportLfs(
  stageId: string,
  reservationId: string,
  facts: ImportRepositoryFacts,
  dependencies: ImportUploadDependencies,
): Promise<void> {
  const { jobs, signal, channel } = dependencies
  let cursor: number | null = 0
  let page = 0
  while (cursor !== null) {
    const batch: ImportJobResults['lfs.page'] = await jobs(
      { action: 'lfs.page', stageId, offset: cursor },
      signal,
    )
    let offset = 0
    while (offset < batch.objects.length) {
      const objects = channel.lfsPage(
        batch.objects.slice(offset),
        reservationId,
        facts.id,
      )
      const result = await channel.exchange({
        kind: 'repository.lfs',
        reservationId,
        factsId: facts.id,
        objects,
      })
      if (result.kind !== 'repository.lfs' || result.factsId !== facts.id)
        throw new LocalImportError('upload_failed')
      const expected = new Set(objects.map(key))
      const received = new Set<string>()
      for (const object of [...result.available, ...result.missing]) {
        const id = key(object)
        if (!expected.has(id) || received.has(id))
          throw new LocalImportError('upload_failed')
        received.add(id)
      }
      if (expected.size !== objects.length || received.size !== expected.size)
        throw new LocalImportError('upload_failed')
      await jobs(
        {
          action: 'lfs.available',
          stageId,
          factsId: facts.id,
          page,
          available: result.available,
        },
        signal,
      )
      page++
      offset += objects.length
    }
    if (batch.nextCursor !== null && batch.nextCursor <= cursor)
      throw new LocalImportError('read_failed')
    cursor = batch.nextCursor
  }
}
