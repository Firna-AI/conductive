import type { OperationContext } from './operations.ts'

export async function waitForHealth(
  ctx: OperationContext,
  origin: string,
): Promise<void> {
  return pollHealth(
    ctx,
    new URL('/api/health', origin),
    async (response) => {
      const value: unknown = await response.json()
      return (
        typeof value === 'object' &&
        value !== null &&
        'status' in value &&
        value.status === 'ok'
      )
    },
    'Preview health did not become ready within two minutes.',
  )
}

export async function waitForRelayHealth(
  ctx: OperationContext,
  origin: string,
): Promise<void> {
  return pollHealth(
    ctx,
    new URL('/', origin),
    async (response) => response.status === 200,
    'Relay health did not return HTTP 200 within two minutes.',
  )
}

async function pollHealth(
  ctx: OperationContext,
  address: URL,
  ready: (response: Response) => Promise<boolean>,
  failure: string,
): Promise<void> {
  const deadline = ctx.io.now() + 120_000
  while (ctx.io.now() < deadline) {
    try {
      const response = await ctx.io.fetch(
        new Request(address, {
          redirect: 'error',
          signal: AbortSignal.timeout(
            Math.max(1, Math.min(10_000, deadline - ctx.io.now())),
          ),
        }),
      )
      if (response.ok && (await ready(response))) return
    } catch {
      /* A new route can need time to reach every location. */
    }
    const wait = Math.min(5000, deadline - ctx.io.now())
    if (wait > 0) await ctx.io.pause(wait)
  }
  throw new Error(failure)
}
