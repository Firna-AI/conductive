import { describe, expect, it } from 'vitest'

import type { ProviderContractFactory } from './contract-fixture.test-support'
import type { ProviderErrorKind } from './errors'

const failures: readonly [
  number,
  Exclude<ProviderErrorKind, 'invalid_response'>,
][] = [
  [400, 'invalid_request'],
  [401, 'unauthorized'],
  [402, 'payment_required'],
  [403, 'forbidden'],
  [404, 'not_found'],
  [409, 'conflict'],
  [429, 'rate_limited'],
  [503, 'unavailable'],
]

function registerControlErrorContract(
  createFixture: ProviderContractFactory,
): void {
  describe('errors', () => {
    it('returns typed provider failures without copying upstream messages', async () => {
      const fixture = createFixture()
      for (const [status, kind] of failures) {
        await fixture.given({ kind: 'failure', errorKind: kind })
        await expect(fixture.provider.get('sandbox-one')).rejects.toMatchObject(
          {
            kind,
            status,
            providerCode: fixture.defaultProviderCode ?? 'provider_code',
            retryAfterSeconds: 3,
          },
        )
        await expect(fixture.provider.get('sandbox-one')).rejects.not.toThrow(
          fixture.secret,
        )
      }
    })

    it('handles network failures and malformed provider success without returning untrusted data', async () => {
      const fixture = createFixture()
      await fixture.given({ kind: 'network_failure' })
      await expect(fixture.provider.get('sandbox-one')).rejects.toMatchObject({
        kind: 'unavailable',
        status: 503,
      })
      await fixture.given({ kind: 'invalid', target: 'sandbox' })
      await expect(fixture.provider.get('sandbox-one')).rejects.toMatchObject({
        kind: 'invalid_response',
        status: 502,
      })
    })
  })
}

function registerCommandErrorContract(
  createFixture: ProviderContractFactory,
): void {
  describe('errors', () => {
    it('rejects malformed detached command results without exposing provider fields', async () => {
      const fixture = createFixture()
      await fixture.given({ kind: 'invalid', target: 'started_command' })
      await expect(
        fixture.provider.startCommand('sandbox-one', 'build'),
      ).rejects.toMatchObject({
        kind: 'invalid_response',
        status: 502,
        message: 'The sandbox provider request failed: invalid_response',
      })
      await fixture.given({ kind: 'invalid', target: 'command_status' })
      await expect(
        fixture.provider.getCommandStatus('sandbox-one', 1234, {
          stdoutOffset: 0,
          stderrOffset: 0,
        }),
      ).rejects.toMatchObject({
        kind: 'invalid_response',
        status: 502,
        message: 'The sandbox provider request failed: invalid_response',
      })
    })

    it('keeps detached start and status errors typed and redacted', async () => {
      const fixture = createFixture()
      await fixture.given({
        kind: 'failure',
        errorKind: 'conflict',
        providerCode: 'agent_outdated',
      })
      await expect(
        fixture.provider.getCommandStatus('sandbox-one', 1234, {
          stdoutOffset: 0,
          stderrOffset: 0,
        }),
      ).rejects.toMatchObject({
        kind: 'conflict',
        status: 409,
        providerCode: fixture.providerCodeFor
          ? fixture.providerCodeFor('agent_outdated')
          : 'agent_outdated',
        retryAfterSeconds: 3,
        message: 'The sandbox provider request failed: conflict',
      })
      await fixture.given({
        kind: 'failure',
        errorKind: 'unavailable',
        providerCode: 'boat_direct_failed',
      })
      await expect(
        fixture.provider.startCommand('sandbox-one', 'build'),
      ).rejects.toMatchObject({
        kind: 'unavailable',
        status: 503,
        providerCode: fixture.providerCodeFor
          ? fixture.providerCodeFor('boat_direct_failed')
          : 'boat_direct_failed',
        message: 'The sandbox provider request failed: unavailable',
      })
    })
  })
}

export function registerErrorContract(
  createFixture: ProviderContractFactory,
): void {
  registerControlErrorContract(createFixture)
  registerCommandErrorContract(createFixture)
}
