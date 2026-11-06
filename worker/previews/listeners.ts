import { ProviderError } from '../sandbox/errors'
import type { PortMode, WorkspaceTools } from './provider'

/** Specific network addresses can belong to Boat's relay. They are not wildcard app listeners. */
export async function listenerMode(
  provider: WorkspaceTools,
  port: number,
  fallback: PortMode = 'network',
): Promise<PortMode> {
  const result = await provider.command('ss -H -ltn')
  if (result.exitCode !== 0 || result.timedOut)
    throw new ProviderError('unavailable', 502)
  let loopback = false
  for (const line of result.stdout.split('\n')) {
    const endpoint = line.trim().split(/\s+/)[3] ?? ''
    const split = endpoint.lastIndexOf(':')
    if (Number(endpoint.slice(split + 1)) !== port) continue
    const address = endpoint.slice(0, split).replace(/^\[|\]$/g, '')
    if (['0.0.0.0', '::', '*'].includes(address)) return 'network'
    if (
      address === '::1' ||
      /^127\./.test(address) ||
      /^::ffff:127\./.test(address)
    )
      loopback = true
  }
  return loopback ? 'localhost' : fallback
}
