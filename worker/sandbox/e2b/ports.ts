import { isRecord } from '../../http'
import { PREVIEW_RELAY_PORT } from '../../../src/shared/previews'
import { ProviderError } from '../errors'
import type { PortMode, PrivatePort } from '../provider'
import { runSupervised } from './commands'
import type { E2bContext } from './context'
import { invalidResponse } from './errors'
import { sandboxSegment } from './identity'
import { getSandbox } from './lifecycle'
import { trafficToken } from './traffic-tokens'
import { registerIngressAlias } from './environment'

function validPort(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 65535
  )
}

export async function privatePort(
  context: E2bContext,
  sandboxId: string,
  port: number,
  mode: PortMode,
): Promise<PrivatePort> {
  if (!validPort(port)) throw new ProviderError('invalid_request', 400)
  const sandbox = await getSandbox(context, sandboxId)
  if (sandbox.state !== 'ready') throw new ProviderError('conflict', 409)
  const token = await trafficToken(context, sandboxId)
  if (!token) throw new ProviderError('unavailable', 503)
  let listeningPort = port
  if (mode === 'localhost') {
    const result = await runSupervised(
      context,
      sandboxId,
      `systemctl start conductive-e2b-port-relay.service && /usr/bin/python3 /run/conductive-e2b/port-relay.py ensure ${port}`,
      10,
      'root',
    )
    if (result.exitCode !== 0 || result.timedOut)
      throw new ProviderError('unavailable', 503)
    let value: unknown
    try {
      value = JSON.parse(result.stdout)
    } catch {
      return invalidResponse()
    }
    if (
      !isRecord(value) ||
      value.targetPort !== port ||
      !validPort(value.listenPort) ||
      value.listenPort === port
    )
      return invalidResponse()
    listeningPort = value.listenPort
    if (port === PREVIEW_RELAY_PORT)
      await registerIngressAlias(context, sandboxId, port, listeningPort)
  }
  return {
    origin: `https://${listeningPort}-${sandboxSegment(sandboxId)}.${context.domain}`,
    credential: {
      headers: { 'e2b-traffic-access-token': token },
      stripHeaders: [
        'e2b-traffic-access-token',
        'x-access-token',
        'e2b-sandbox-id',
        'e2b-sandbox-port',
      ],
      stripCookies: [],
      stripQueryParameters: [],
    },
  }
}
