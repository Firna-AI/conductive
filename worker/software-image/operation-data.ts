import type { SoftwareImage } from './types'

export async function saveSoftwareImageOperation(
  db: D1Database,
  image: SoftwareImage,
  operation: NonNullable<SoftwareImage['operation']>,
): Promise<boolean> {
  const result = await db
    .prepare(
      `INSERT INTO software_image_operations (image_id, phase, revision, operation)
       SELECT ?, ?, ?, ? WHERE EXISTS (
         SELECT 1 FROM software_images WHERE id = ? AND state = ? AND phase = ? AND revision = ?)
       ON CONFLICT(image_id) DO UPDATE SET phase = excluded.phase, revision = excluded.revision,
         operation = excluded.operation
       WHERE software_image_operations.revision != excluded.revision
         OR software_image_operations.phase != excluded.phase
         OR CASE software_image_operations.operation WHEN 'ready' THEN 1 WHEN 'auto-stop' THEN 2 ELSE 3 END
           <= CASE excluded.operation WHEN 'ready' THEN 1 WHEN 'auto-stop' THEN 2 ELSE 3 END`,
    )
    .bind(
      image.id,
      image.phase,
      image.revision,
      operation,
      image.id,
      image.state,
      image.phase,
      image.revision,
    )
    .run()
  return result.meta.changes === 1
}

export async function clearSoftwareImageOperation(
  db: D1Database,
  image: SoftwareImage,
): Promise<void> {
  await db
    .prepare(
      `DELETE FROM software_image_operations WHERE image_id = ? AND phase = ? AND revision = ?`,
    )
    .bind(image.id, image.phase, image.revision)
    .run()
}
