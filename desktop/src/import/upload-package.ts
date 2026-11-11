import type {
  ImportReservation,
  ImportScanRow,
} from '../../../src/shared/conductor-import-operation.ts'
import type { ImportStage } from './types.ts'
import { LocalImportError } from './types.ts'
import { requireKind } from './upload-context.ts'
import { prepareImportLfs } from './upload-lfs.ts'
import { proveImportPrerequisites } from './upload-prerequisites.ts'
import type {
  ImportUploadDependencies,
  UploadAction,
} from './upload-context.ts'

export async function packageImportStage(
  action: UploadAction,
  reservation: ImportReservation,
  reservedRow: ImportScanRow,
  dependencies: ImportUploadDependencies,
): Promise<{ stage: ImportStage; reservation: ImportReservation }> {
  const { jobs, channel, signal, scope } = dependencies
  if (action.action === 'retry' && reservation.id === action.reservationId) {
    const previous = await jobs(
      {
        action: 'reuse',
        localWorkspaceId: action.localWorkspaceId,
        scope,
        reservationId: reservation.id,
      },
      signal,
    )
    if (
      previous &&
      previous.snapshot.sourceFingerprint === reservation.sourceFingerprint
    )
      return { stage: previous, reservation }
    const row = await jobs(
      { action: 'row', localWorkspaceId: action.localWorkspaceId },
      signal,
    )
    if (!row) throw new LocalImportError('source_missing')
    reservation = requireKind(
      await channel.exchange({
        kind: 'reserve',
        row,
        replace: {
          reservationId: reservation.id,
          sourceFingerprint: reservation.sourceFingerprint,
        },
      }),
      'reservation',
    ).reservation
    reservedRow = row
  }
  const prepared = await jobs(
    {
      action: 'prepare',
      localWorkspaceId: action.localWorkspaceId,
      scope,
      reservationId: reservation.id,
    },
    signal,
  )
  if (
    prepared.row.localWorkspaceId !== reservedRow.localWorkspaceId ||
    prepared.row.name !== reservedRow.name ||
    prepared.row.repository !== reservedRow.repository ||
    prepared.row.branch !== reservedRow.branch
  )
    throw new LocalImportError('source_changed')
  const facts = requireKind(
    await channel.exchange({
      kind: 'repository.facts',
      reservationId: reservation.id,
    }),
    'repository.facts',
  ).facts
  if (
    facts.fullName.toLowerCase() !== prepared.row.repository?.toLowerCase() ||
    facts.branch !== prepared.row.branch
  )
    throw new LocalImportError('source_changed')
  await prepareImportLfs(prepared.id, reservation.id, facts, dependencies)
  let exclusions: string[] | undefined
  for (;;) {
    const stage = await jobs(
      { action: 'build', stageId: prepared.id, facts, exclusions },
      signal,
    )
    if (!stage.candidates.length)
      return {
        stage: await jobs(
          { action: 'seal', stageId: stage.id, prerequisites: [] },
          signal,
        ),
        reservation,
      }
    const prerequisites = await proveImportPrerequisites(
      stage,
      reservation.id,
      facts,
      dependencies,
    )
    if (prerequisites.length === stage.candidates.length)
      return {
        stage: await jobs(
          {
            action: 'seal',
            stageId: stage.id,
            prerequisites,
          },
          signal,
        ),
        reservation,
      }
    exclusions = prerequisites.map((entry) => entry.oid)
  }
}
