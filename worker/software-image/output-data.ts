import type { RedactedCommandOutput } from '../lifecycle/build-output-redaction'
import type { SoftwareImage } from './types'

const OUTPUT_PART_BYTES = 64 * 1024
const PARTS_PER_STATEMENT = 40

/** Keep each value small, without dropping the full output of a status reply. */
export function softwareImageOutputStatements(
  db: D1Database,
  image: SoftwareImage,
  output: RedactedCommandOutput,
): D1PreparedStatement[] {
  const bytes = new TextEncoder().encode(output.text)
  const parts: string[] = []
  for (let start = 0; start < bytes.length;) {
    let end = Math.min(start + OUTPUT_PART_BYTES, bytes.length)
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--
    parts.push(new TextDecoder().decode(bytes.subarray(start, end)))
    start = end
  }
  const statements: D1PreparedStatement[] = []
  for (let start = 0; start < parts.length; start += PARTS_PER_STATEMENT) {
    const values = parts.slice(start, start + PARTS_PER_STATEMENT)
    statements.push(
      db
        .prepare(
          `INSERT INTO software_image_output (image_id, revision, part, output)
           SELECT ?, ?, column1, column2 FROM (VALUES ${values.map(() => '(?, ?)').join(', ')})
           WHERE EXISTS (SELECT 1 FROM software_images
             WHERE id = ? AND state = ? AND phase = ? AND revision = ?)
           ON CONFLICT DO NOTHING`,
        )
        .bind(
          image.id,
          image.revision + 1,
          ...values.flatMap((text, index) => [start + index, text]),
          image.id,
          image.state,
          image.phase,
          image.revision,
        ),
    )
  }
  return statements
}

/** Claim one full status reply once, within D1's query-result size limit. */
export async function claimSoftwareImageOutput(
  db: D1Database,
  imageId: string,
): Promise<string[]> {
  const claimed = await db
    .prepare(
      `DELETE FROM software_image_output WHERE image_id = ?
       AND revision = (SELECT MIN(revision) FROM software_image_output WHERE image_id = ?)
       RETURNING revision, part, output`,
    )
    .bind(imageId, imageId)
    .all<{ revision: number; part: number; output: string }>()
  return claimed.results
    .sort(
      (left, right) => left.revision - right.revision || left.part - right.part,
    )
    .map((part) => part.output)
}
