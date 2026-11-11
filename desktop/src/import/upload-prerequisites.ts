import type { ImportPrerequisite } from '../../../src/shared/conductor-import-manifest.ts'
import type { ImportRepositoryFacts } from '../../../src/shared/conductor-import-operation.ts'
import type { ImportStage } from './types.ts'
import type { ImportUploadDependencies } from './upload-context.ts'
import { requireKind } from './upload-context.ts'

/** Each receipt page binds its actual omitted roots to this final fingerprint. */
export async function proveImportPrerequisites(
  stage: ImportStage,
  reservationId: string,
  facts: ImportRepositoryFacts,
  dependencies: ImportUploadDependencies,
): Promise<ImportPrerequisite[]> {
  const { channel } = dependencies
  const captured = new Set([facts.branchHeadOid, facts.defaultHeadOid])
  const result = new Map<string, ImportPrerequisite>()
  let offset = 0
  while (offset < stage.candidates.length) {
    const event = (candidates: string[]) =>
      ({
        kind: 'repository.prerequisites',
        reservationId,
        factsId: facts.id,
        sourceFingerprint: stage.snapshot.sourceFingerprint,
        headOid: stage.snapshot.headOid,
        candidates,
      }) as const
    const candidates = channel.page(
      stage.candidates.slice(offset, offset + 256),
      event,
    )
    const proof = requireKind(
      await channel.exchange(event(candidates)),
      'repository.prerequisites',
    )
    const requested = new Set(candidates)
    for (const entry of proof.verified) {
      if (requested.has(entry.oid) && captured.has(entry.headOid))
        result.set(entry.oid, {
          kind: 'prerequisite',
          oid: entry.oid,
          receiptId: proof.receiptId,
        })
    }
    offset += candidates.length
  }
  return [...result.values()]
}
