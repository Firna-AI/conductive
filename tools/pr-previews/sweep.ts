import { Cloudflare } from './cloudflare.ts'
import { listDatabases } from './database.ts'
import { deletePreview } from './delete.ts'
import { GitHub } from './github.ts'
import { previewNumber } from './names.ts'
import type { OperationContext } from './operations.ts'
import { PreviewRegistry } from './registry.ts'
import { record } from './remote-values.ts'

export async function sweepPreviews(ctx: OperationContext) {
  const github = new GitHub(ctx.environment, ctx.io)
  const cf = new Cloudflare(ctx)
  const scripts = await cf.list(cf.account('/workers/scripts'))
  const workers = new Set<number>()
  for (const entry of scripts) {
    const number = previewNumber(
      record(entry, 'Cloudflare Worker').id,
      'conductive-pr-',
    )
    if (number !== null) workers.add(number)
  }
  const databases = (await listDatabases(ctx)).flatMap((entry) => {
    const number = previewNumber(entry.name, 'conductive-pr-')
    return number === null ? [] : [number]
  })
  const registry = new PreviewRegistry(ctx)
  const registered = new Set(await registry.numbers())
  const candidates = new Set([...workers, ...databases, ...registered])
  const deleted: number[] = []
  const removedRegistry: number[] = []
  for (const number of [...candidates].sort((a, b) => a - b)) {
    const state = await github.pullState(number)
    if (state !== 'open') {
      await deletePreview(ctx, number, registry)
      deleted.push(number)
    }
    if (!workers.has(number) && registered.has(number)) {
      if (state === 'open') await registry.remove(number)
      removedRegistry.push(number)
    }
  }
  return { deleted, removedRegistry }
}
