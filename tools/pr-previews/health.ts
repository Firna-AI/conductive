import type { OperationContext } from './operations.ts'

export async function waitForHealth(
  ctx: OperationContext,
  origin: string,
): Promise<void> {
  const deadline = ctx.io.now() + 120_000
  while (ctx.io.now() < deadline) {
    try {
      const response = await ctx.io.fetch(
        new Request(new URL('/api/health', origin), {
          redirect: 'error',
          signal: AbortSignal.timeout(
            Math.max(1, Math.min(10_000, deadline - ctx.io.now())),
          ),
        }),
      )
      if (response.ok) {
        const value: unknown = await response.json()
        if (
          typeof value === 'object' &&
          value !== null &&
          'status' in value &&
          value.status === 'ok'
        )
          return
      }
    } catch {
      /* A new route can need time to reach every location. */
    }
    const wait = Math.min(5000, deadline - ctx.io.now())
    if (wait > 0) await ctx.io.pause(wait)
  }
  throw new Error('Preview health did not become ready within two minutes.')
}
