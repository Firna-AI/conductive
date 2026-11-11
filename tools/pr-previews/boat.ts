import type { OperationContext } from './operations.ts'
import { array, httpJson, record, text } from './remote-values.ts'
import type { PreviewResources } from './resources.ts'

async function boatRequest(
  ctx: OperationContext,
  path: string,
  method = 'GET',
  id?: string,
) {
  const headers = new Headers({
    Authorization: `Bearer ${ctx.settings.secrets.BOAT_API_KEY}`,
    Accept: 'application/json',
    'X-Boat-Org': ctx.settings.variables.BOAT_ORG_ID,
  })
  if (id !== undefined) headers.set('X-Ascii-Confirm-Delete', id)
  const value = await httpJson(
    ctx.io.fetch,
    new Request(`https://boat.dev/api/v1${path}`, {
      method,
      headers,
      redirect: 'error',
    }),
    'Boat',
    method === 'DELETE',
  )
  if (value !== null && record(value, 'Boat').ok !== true)
    throw new Error('Boat returned an unsuccessful reply.')
  return value
}

export async function deleteBoatResources(
  ctx: OperationContext,
  resources: PreviewResources,
): Promise<void> {
  for (const orgId of resources.orgIds) {
    let cursor = ''
    do {
      const query = new URLSearchParams({
        org: ctx.settings.variables.BOAT_ORG_ID,
        label: `org=${orgId}`,
        limit: '200',
      })
      if (cursor) query.set('cursor', cursor)
      const page = record(
        await boatRequest(ctx, `/sandboxes?${query}`),
        'Boat sandbox list',
      )
      for (const entry of array(page.sandboxes, 'Boat sandboxes')) {
        const id = text(record(entry, 'Boat sandbox').id, 'Boat sandbox ID')
        await boatRequest(
          ctx,
          `/sandboxes/${encodeURIComponent(id)}`,
          'DELETE',
          id,
        )
      }
      const info =
        page.pageInfo === undefined
          ? {}
          : record(page.pageInfo, 'Boat pagination')
      if (
        info.nextCursor !== undefined &&
        info.nextCursor !== null &&
        typeof info.nextCursor !== 'string'
      )
        throw new Error('Boat returned invalid pagination.')
      cursor = typeof info.nextCursor === 'string' ? info.nextCursor : ''
    } while (cursor)
  }
  for (const name of resources.snapshots)
    await boatRequest(
      ctx,
      `/saved-snapshots/${encodeURIComponent(name)}`,
      'DELETE',
    )
}
