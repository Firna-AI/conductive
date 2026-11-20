import { E2bControl } from './control'
import { invalidResponse, pendingOperation } from './errors'

export async function inventoryMatch(
  control: E2bControl,
  operation: 'listSandboxes' | 'listSnapshots',
  query: URLSearchParams,
  match: (value: unknown) => string | null,
): Promise<string | null> {
  const signal = AbortSignal.timeout(30_000)
  const seen = new Set<string>()
  let found: string | null = null
  query.set('limit', '100')
  while (true) {
    const reply = await control.request({ operation }, { query, signal })
    if (!Array.isArray(reply.value)) return invalidResponse()
    for (const row of reply.value) {
      const id = match(row)
      if (id !== null) {
        if (found !== null) return pendingOperation()
        found = id
      }
    }
    const cursor = reply.headers.get('X-Next-Token')
    if (!cursor) return found
    if (seen.has(cursor)) return invalidResponse()
    seen.add(cursor)
    query.set('nextToken', cursor)
  }
}
