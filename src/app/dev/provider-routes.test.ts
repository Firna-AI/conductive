import { describe, expect, test } from 'vitest'
import { API_PATHS } from '../../shared/api'
import { operatorOrgPath, operatorOrgsPath } from '../../shared/operator'
import { operatorProvidersPath } from '../../shared/operator-providers'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { devFetch } from './dev-test-kit'

describe('the provider routes of the dev fake', () => {
  test('keep the weights of new orgs with their last change, refuse what the Worker refuses, and give a new org the account that an operator chose', async () => {
    let time = FAKE_TIME
    const { send } = devFetch('?operator=1&providers=three', () => {
      time += 60_000
      return time
    })
    const path = operatorProvidersPath()
    const first = await send('GET', path)
    const saved = await send('PUT', path, { weights: { boat: 80, e2b: 20 } })
    const repeat = await send('PUT', path, {
      weights: { boat: 80, e2b: 20, 'e2b-us': 0 },
    })
    const short = await send('PUT', path, { weights: { boat: 80, e2b: 10 } })
    const unknown = await send('PUT', path, { weights: { boat: 90, x: 10 } })
    const created = await send('POST', API_PATHS.orgs, {
      name: 'Test Lab',
      repositoryIds: [7],
      providerAccount: 'e2b-us',
    })
    const counted = await send('GET', path)
    const listed = await send('GET', operatorOrgsPath({ q: 'Test Lab' }))
    const page = await send('GET', operatorOrgPath('test-lab'))
    const invalid = {
      status: 400,
      body: {
        error: {
          code: 'invalid_input',
          message:
            'Choose whole percentages for configured accounts that add up to 100.',
        },
      },
    }
    const changed = {
      updatedAt: FAKE_TIME + 60_000,
      operator: { githubId: 1, login: 'calummoore' },
    }
    expect({ first, saved, repeat, short, unknown }).toEqual({
      first: {
        status: 200,
        body: {
          accounts: [
            { id: 'boat', weight: 100, orgs: 14 },
            { id: 'e2b', weight: 0, orgs: 0 },
            { id: 'e2b-us', weight: 0, orgs: 0 },
          ],
          updatedAt: null,
          operator: null,
        },
      },
      saved: {
        status: 200,
        body: {
          accounts: [
            { id: 'boat', weight: 80, orgs: 14 },
            { id: 'e2b', weight: 20, orgs: 0 },
            { id: 'e2b-us', weight: 0, orgs: 0 },
          ],
          ...changed,
        },
      },
      repeat: saved,
      short: invalid,
      unknown: invalid,
    })
    expect({
      created: created.status,
      counted: counted.body,
      listed: listed.body,
      page: page.body,
    }).toMatchObject({
      created: 201,
      counted: {
        accounts: [
          { id: 'boat', orgs: 14 },
          { id: 'e2b', orgs: 0 },
          { id: 'e2b-us', orgs: 1 },
        ],
      },
      listed: {
        orgs: [{ name: 'Test Lab', providerAccount: 'e2b-us' }],
        total: 1,
      },
      // Its first build runs, as Create org starts it.
      page: {
        providerAccount: 'e2b-us',
        running: { workspaces: 0, builds: 1 },
      },
    })
  })

  test('give the new org of a person who is not an operator an account from the weights, whatever account the request names', async () => {
    const { backend, send } = devFetch('')
    const created = await send('POST', API_PATHS.orgs, {
      name: 'Test Lab',
      repositoryIds: [7],
      providerAccount: 'e2b',
    })
    expect({
      created: created.status,
      account: backend.state.providers.made.get('test-lab')?.providerAccount,
    }).toEqual({ created: 201, account: 'boat' })
  })
})
