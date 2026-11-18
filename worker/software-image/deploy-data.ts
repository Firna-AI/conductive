export async function associateSoftwareImageDeploy(
  db: D1Database,
  digest: string,
  imageId: string,
  expiresAt: number,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO software_image_deploys (token_digest, image_id, expires_at) VALUES (?, ?, ?)
       ON CONFLICT(token_digest) DO UPDATE SET image_id = excluded.image_id, expires_at = excluded.expires_at`,
    )
    .bind(digest, imageId, expiresAt)
    .run()
}

export async function cleanupSoftwareImageProgress(
  db: D1Database,
  now: number,
): Promise<void> {
  await db.batch([
    db
      .prepare('DELETE FROM software_image_deploys WHERE expires_at < ?')
      .bind(now),
    db.prepare(
      `DELETE FROM software_image_operations WHERE image_id IN
       (SELECT id FROM software_images WHERE state != 'building')`,
    ),
    db
      .prepare(
        `DELETE FROM software_image_output WHERE image_id IN (
           SELECT id FROM software_images WHERE state != 'building' AND started_at + 1800000 < ?
             AND NOT EXISTS (SELECT 1 FROM software_image_deploys WHERE image_id = software_images.id))`,
      )
      .bind(now),
  ])
}
