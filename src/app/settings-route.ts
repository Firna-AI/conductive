import type { Route } from './router'

/** A route of Settings: a tab of the account or of an org, or the list. */
export type SettingsRoute = Extract<
  Route,
  { screen: 'account' | 'settings' | 'settings-list' }
>

/** Whether a route shows Settings. */
export function isSettingsRoute(route: Route): route is SettingsRoute {
  return (
    route.screen === 'account' ||
    route.screen === 'settings' ||
    route.screen === 'settings-list'
  )
}
