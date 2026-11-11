import { cleanupDatabaseResources } from './cleanup.ts'
import { deleteDatabase, findDatabase } from './database.ts'
import { previewNames } from './names.ts'
import type { OperationContext } from './operations.ts'
import { PreviewRegistry } from './registry.ts'
import { deleteWorker } from './workers.ts'

export async function deletePreview(
  ctx: OperationContext,
  number: number,
  registry?: PreviewRegistry,
): Promise<void> {
  const names = previewNames(number, ctx.settings.zone)
  await (registry ?? new PreviewRegistry(ctx)).remove(number)
  const database = await findDatabase(ctx, names.databaseName)
  if (database !== null) await cleanupDatabaseResources(ctx, database.name)
  await deleteWorker(ctx, names)
  if (database !== null) await deleteDatabase(ctx, database.name)
}
