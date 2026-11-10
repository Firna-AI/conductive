import type { ImportPart } from '../../../src/shared/conductor-import-storage.ts'
import type { ImportStage } from './types.ts'
import { LocalImportError } from './types.ts'
import { requireKind } from './upload-context.ts'
import type { ImportUploadDependencies } from './upload-context.ts'
import { verifyLocalPart } from './upload.ts'

export async function uploadImportPart(
  part: ImportPart,
  stage: ImportStage,
  reservationId: string,
  dependencies: ImportUploadDependencies,
) {
  const { channel, jobs, signal, orgId, put, now } = dependencies
  const bytes = await jobs({ action: 'part', stageId: stage.id, part }, signal)
  verifyLocalPart(part, bytes)
  let uploaded = false
  for (let attempt = 0; attempt < 2; attempt++) {
    const { target } = requireKind(
      await channel.exchange({
        kind: 'target',
        reservationId,
        partId: part.id,
      }),
      'target',
    )
    if (
      target.identity.scope.orgId !== orgId ||
      target.identity.scope.reservationId !== reservationId ||
      target.identity.part.id !== part.id ||
      target.identity.part.group !== part.group ||
      target.identity.part.sizeBytes !== part.sizeBytes ||
      target.identity.part.sha256 !== part.sha256
    )
      throw new LocalImportError('upload_failed')
    signal.throwIfAborted()
    if (target.expiresAt <= now()) continue
    const status = await put(target, bytes, signal)
    signal.throwIfAborted()
    if (status >= 200 && status < 300) {
      uploaded = true
      break
    }
    if (target.expiresAt > now()) throw new LocalImportError('upload_failed')
  }
  if (!uploaded) throw new LocalImportError('upload_failed')
  await channel.exchange({
    kind: 'progress',
    reservationId,
    inFlightBytes: part.sizeBytes,
  })
  const verification = requireKind(
    await channel.exchange({ kind: 'verify', reservationId, partId: part.id }),
    'verified',
  )
  if (!verification.verified) throw new LocalImportError('upload_failed')
  await channel.exchange({ kind: 'progress', reservationId, inFlightBytes: 0 })
}
