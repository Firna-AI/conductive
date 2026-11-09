import { describe, expect, test } from 'vitest'
import { parseRoute, routes, SETTINGS_TABS, type Route } from './router'

function parse(path: string): Route {
  const url = new URL(path, 'https://app.conductive.test')
  return parseRoute(url.pathname, url.search)
}

describe('routes', () => {
  test('each screen and tab has an address that leads back to it', () => {
    const cases: readonly [string, Route][] = [
      [routes.home(), { screen: 'home' }],
      [routes.account('codex'), { screen: 'account', connect: 'codex' }],
      [routes.createOrg(true), { screen: 'create-org', first: true }],
      [
        routes.newWorkspace('acme', 'checkout'),
        { screen: 'new-workspace', orgId: 'acme', sectionId: 'checkout' },
      ],
      [
        routes.workspace('acme', 'saved carts', 'files'),
        {
          screen: 'workspace',
          orgId: 'acme',
          workspaceId: 'saved carts',
          view: ['files'],
        },
      ],
      ...SETTINGS_TABS.map((tab): [string, Route] => [
        routes.settings('acme', tab),
        { screen: 'settings', orgId: 'acme', tab },
      ]),
    ]
    for (const [path, route] of cases) {
      expect(parse(path), path).toEqual(route)
    }
    expect(parse('/orgs/acme/settings/billing')).toEqual({
      screen: 'not-found',
    })
  })

  test('each page of the operator section has an address that leads back to it, with the search in the query', () => {
    const cases: readonly [string, Route][] = [
      [routes.operator(), { screen: 'operator', view: { page: 'overview' } }],
      [
        routes.operatorOrgs(),
        { screen: 'operator', view: { page: 'orgs', search: '' } },
      ],
      [
        routes.operatorOrgs('north wind & co'),
        {
          screen: 'operator',
          view: { page: 'orgs', search: 'north wind & co' },
        },
      ],
      [
        routes.operatorUsers('dan'),
        { screen: 'operator', view: { page: 'users', search: 'dan' } },
      ],
      [
        routes.operatorWaitlist('sam okafor'),
        {
          screen: 'operator',
          view: { page: 'waitlist', search: 'sam okafor' },
        },
      ],
      [
        routes.operatorCodes(),
        { screen: 'operator', view: { page: 'codes', search: '' } },
      ],
      [
        routes.operatorCodes('K7QHM-3XP2R'),
        { screen: 'operator', view: { page: 'codes', search: 'K7QHM-3XP2R' } },
      ],
      [
        routes.operatorOrg('org/h3x w4v'),
        { screen: 'operator', view: { page: 'org', id: 'org/h3x w4v' } },
      ],
      [
        routes.operatorUser(58201734),
        { screen: 'operator', view: { page: 'user', githubId: 58201734 } },
      ],
    ]
    for (const [path, route] of cases) {
      expect(parse(path), path).toEqual(route)
    }
    expect(parse('/operator/orgs?q=%20%20')).toEqual({
      screen: 'operator',
      view: { page: 'orgs', search: '' },
    })
    for (const path of [
      '/operator/settings',
      '/operator/users/dana-k',
      '/operator/users/0',
      '/operator/orgs/acme/members',
      '/operator/waitlist/58201734',
      '/operator/codes/K7QHM-3XP2R',
    ]) {
      expect(parse(path), path).toEqual({ screen: 'not-found' })
    }
  })
})
