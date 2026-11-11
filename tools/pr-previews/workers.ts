import { Cloudflare } from './cloudflare.ts'
import type { PreviewNames } from './names.ts'
import type { OperationContext } from './operations.ts'
import { record, text } from './remote-values.ts'

export async function deleteWorker(
  ctx: OperationContext,
  names: PreviewNames,
): Promise<void> {
  const cf = new Cloudflare(ctx)
  await cf.request(
    cf.account(
      `/workers/scripts/${encodeURIComponent(names.workerName)}?force=true`,
    ),
    'DELETE',
    undefined,
    true,
  )
  const zones = await cf.pages(
    `/zones?${new URLSearchParams({ name: names.zone })}`,
  )
  for (const value of zones) {
    const zone = record(value, 'Cloudflare zone')
    if (zone.name !== names.zone) continue
    const id = encodeURIComponent(text(zone.id, 'Cloudflare zone ID'))
    const routes = await cf.list(`/zones/${id}/workers/routes`)
    for (const entry of routes) {
      const route = record(entry, 'Cloudflare route')
      if (route.script !== names.workerName) continue
      const routeId = encodeURIComponent(text(route.id, 'Cloudflare route ID'))
      await cf.request(
        `/zones/${id}/workers/routes/${routeId}`,
        'DELETE',
        undefined,
        true,
      )
    }
  }
}
