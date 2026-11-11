import { deleteBoatResources } from './boat.ts'
import type { OperationContext } from './operations.ts'
import { databaseResources } from './resources.ts'
import { deleteAttachments } from './storage.ts'

export async function cleanupDatabaseResources(
  ctx: OperationContext,
  database: string,
): Promise<void> {
  const resources = await databaseResources(ctx, database)
  await deleteBoatResources(ctx, resources)
  await deleteAttachments(ctx, resources.orgIds)
}
