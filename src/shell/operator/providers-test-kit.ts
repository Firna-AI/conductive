import { routes } from '../../app/router'
import {
  operatorProvidersPath,
  type OperatorProvidersResponse,
} from '../../shared/operator-providers'
import { byLabel, byRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { sampleOperator } from '../../test-support/fixtures/operator'
import { serveOperator } from '../../test-support/operator'
import { mountShell } from './operator-test-kit'

/** The replies, the words, and the controls that the tests of the Providers tab share. */
export const providersPath = operatorProvidersPath()

/** 25 minutes before the time of the samples, which the page writes 15 Jan at 07:35. */
export const CHANGED_AT = FAKE_TIME - 25 * 60_000

/** A reply of the Worker: each account as `[id, weight, orgs]`, and the time of its change. */
export function reply(
  accounts: readonly (readonly [string, number, number])[],
  at: number | null = null,
): OperatorProvidersResponse {
  return {
    accounts: accounts.map(([id, weight, orgs]) => ({ id, weight, orgs })),
    updatedAt: at,
    operator: at === null ? null : sampleOperator,
  }
}

/** The answer of a request that failed. */
export const failure = {
  error: { code: 'internal_error', message: 'The request failed.' },
}

/** The title and the line of the New orgs box, before its control. */
export const intro =
  'New orgs Each new org gets an account by chance, from these weights. An org keeps its account for its whole life.'

/** The line of a change at `CHANGED_AT` by the operator of the samples. */
export const changed = 'Changed on 15 Jan at 07:35 by @calummoore'

/** The control of the weights, and Save weights. */
export function controls(view: HTMLElement) {
  return {
    weights: byLabel('Weights of new orgs', view),
    save: byRole('button', 'Save weights', view),
  }
}

/** The Providers tab over a server with the samples and this first reply. */
export async function openProviders(first: OperatorProvidersResponse) {
  const server = new FakeApiServer()
  serveOperator(server)
  server.json('GET', providersPath, first)
  const shell = await mountShell(server, routes.operatorProviders())
  return { server, ...shell }
}
