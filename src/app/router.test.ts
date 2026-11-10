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
      [routes.routines('acme'), { screen: 'routines', orgId: 'acme' }],
      [routes.newRoutine('acme'), { screen: 'new-routine', orgId: 'acme' }],
      [
        routes.routine('acme', 'review prs'),
        { screen: 'routine', orgId: 'acme', routineId: 'review prs' },
      ],
    ]
    for (const [path, route] of cases) {
      expect(parse(path), path).toEqual(route)
    }
    expect(parse('/orgs/acme/settings/billing')).toEqual({
      screen: 'not-found',
    })
    expect(parse('/orgs/acme/routines/review-prs/runs')).toEqual({
      screen: 'not-found',
    })
  })
})
