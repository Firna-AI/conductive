import { GatewayRequestError } from './errors'

function unavailable(): never {
  throw new GatewayRequestError(
    'model_upstream_unavailable',
    'The workspace routing is not available.',
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function record(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return unavailable()
  return value
}

/** Only authenticated provider metadata selects a destination or routing header. */
export function codexRouting(value: unknown, accountId: string | null) {
  const body = record(value)
  if (!accountId || !Array.isArray(body.accounts)) return unavailable()
  const accounts = body.accounts.map((account: unknown) => record(account))
  const matches = accounts.filter((account) => account.id === accountId)
  if (matches.length !== 1) return unavailable()
  const account = matches[0]
  const origin = account.workspace_backend_origin
  const override = account.account_routing_override
  if (
    typeof origin !== 'string' ||
    typeof override !== 'string' ||
    !['NO_CONSTRAINT', 'us', 'us_cr'].includes(override)
  )
    return unavailable()
  let upstream = 'https://chatgpt.com'
  if (origin !== 'NO_CONSTRAINT') {
    const url = new URL(origin)
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    )
      return unavailable()
    upstream = url.origin
  }
  return {
    origin: upstream,
    override: override === 'NO_CONSTRAINT' ? null : override,
    body: {
      ...body,
      accounts: accounts.map((entry) => ({
        ...entry,
        workspace_backend_origin: 'NO_CONSTRAINT',
        account_routing_override: 'NO_CONSTRAINT',
      })),
    },
  }
}
