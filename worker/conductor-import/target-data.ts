import type { ImportUploadIdentity } from '../../src/shared/conductor-import-storage.ts'
import { readImportPart } from '../../src/shared/conductor-import-manifest-read.ts'
import {
  importObject,
  importText,
} from '../../src/shared/conductor-import-values.ts'

export async function importTargetPage(
  db: D1Database,
  reservationId: string,
  partId: string,
  after: string,
) {
  const rows = await db
    .prepare(
      `WITH candidates AS (SELECT upload_id,identity_json AS json FROM conductor_import_targets
    WHERE reservation_id = ? AND part_id = ? AND upload_id > ? ORDER BY upload_id LIMIT 32),
    sized AS (SELECT *,SUM(length(CAST(json AS BLOB))) OVER (ORDER BY upload_id) AS bytes FROM candidates)
    SELECT json FROM sized WHERE bytes <= 750000 OR upload_id = (SELECT MIN(upload_id) FROM candidates) ORDER BY upload_id`,
    )
    .bind(reservationId, partId, after)
    .all<{ json: string }>()
  return rows.results.map(({ json }): ImportUploadIdentity => {
    const row = importObject(JSON.parse(json))
    const scope = importObject(row.scope)
    return {
      scope: {
        orgId: importText(scope.orgId),
        reservationId: importText(scope.reservationId),
      },
      part: readImportPart(row.part),
      uploadId: importText(row.uploadId),
    }
  })
}
