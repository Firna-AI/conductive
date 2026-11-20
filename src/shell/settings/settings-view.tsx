import type { ReactNode } from 'react'
import { activeOrgs, keptOrg } from '../../app/kept-org'
import { routeOf } from '../../app/navigation'
import {
  isSettingsRoute,
  routeOrgId,
  routes,
  type Route,
  type SettingsRoute,
} from '../../app/router'
import { useStore } from '../../app/store'
import type { User } from '../../shared/api'
import type { OrgSummary } from '../../shared/orgs'
import { AccountTabContent } from '../account/AccountTabContent'
import { useApp } from '../context'
import { PhoneFrame } from '../layout/frames'
import { Page } from '../layout/Page'
import { useMacApp } from '../mac/mac-app'
import { useGo } from '../ui/AppLink'
import { useViewport } from '../ui/viewport'
import { OrgTabContent } from './OrgTabContent'
import { SettingsDialog } from './SettingsDialog'
import { SettingsNav } from './SettingsNav'
import { settingsGroups, tabTitle } from './settings-tabs'

type TabRoute = Extract<SettingsRoute, { tab: unknown }>

/** The tab of a route of Settings. The list shows General on a desktop. */
function tabRouteOf(route: SettingsRoute): TabRoute {
  return route.screen === 'settings-list'
    ? { screen: 'account', tab: 'general', connect: null }
    : route
}

/** The content of the tab of a route. */
function TabContent(props: {
  route: TabRoute
  org: OrgSummary | undefined
  user: User
}) {
  const { route, org } = props
  if (route.screen === 'account') {
    return (
      <AccountTabContent
        connect={route.connect}
        tab={route.tab}
        user={props.user}
      />
    )
  }
  return org ? (
    <OrgTabContent org={org} tab={route.tab} user={props.user} />
  ) : null
}

/** A screen of the signed-in app that is not one of Settings. */
export type PageRoute = Exclude<Route, SettingsRoute>

/**
 * What the address shows: a page, with the Settings dialog over it on a
 * desktop, or a screen of Settings on a phone. The page keeps its place in
 * the tree while the dialog opens and closes, so it keeps its state.
 */
export type SettingsView =
  | { kind: 'page'; route: PageRoute; dialog: ReactNode }
  | { kind: 'screen'; screen: ReactNode }

/**
 * Settings at its address. A desktop shows the page below, `below`, with
 * the Settings dialog over it. `below` is the last page that the tab
 * showed. Without one, the page below is the workspace list of the org of
 * the org settings, or Get started without an org. A phone shows the list
 * of the tabs at `/settings`, and each tab as a screen of its own. The org
 * of the org settings is the org of the address, else of the page below,
 * else the org that the person opened last. An address of an org that the
 * person cannot open, or a deleted org, shows the page of that org. Any
 * other address shows its page, without a dialog.
 */
export function useSettingsView(
  route: Route,
  below: string | null,
  user: User,
): SettingsView {
  const app = useApp()
  const all = useStore(app.orgs)
  const lastOrg = useStore(app.lastOrg)
  const phone = useViewport() === 'phone'
  const mac = useMacApp() !== null
  const go = useGo()
  if (!isSettingsRoute(route)) return { kind: 'page', route, dialog: null }
  const shown = below === null ? null : routeOf(below)
  const belowOrgId = shown === null ? null : routeOrgId(shown)
  if (route.screen === 'settings') {
    const named = all.find((item) => item.id === route.orgId)
    if (!named || named.deletion) {
      return {
        kind: 'page',
        route: { screen: 'org', orgId: route.orgId },
        dialog: null,
      }
    }
  }
  const org =
    route.screen === 'settings'
      ? all.find((item) => item.id === route.orgId)
      : (activeOrgs(all).find((item) => item.id === belowOrgId) ??
        keptOrg(all, lastOrg))
  const groups = (selected: SettingsRoute | null) =>
    settingsGroups({ route: selected, org, mac })
  const tab = tabRouteOf(route)
  const content = <TabContent org={org} route={tab} user={user} />
  const { title, group } = tabTitle(tab, org)
  if (phone && route.screen === 'settings-list') {
    return {
      kind: 'screen',
      screen: (
        <PhoneFrame>
          <Page
            back={{ label: 'Workspaces', to: routes.home() }}
            title="Settings"
          >
            <SettingsNav groups={groups(null)} variant="touch" />
          </Page>
        </PhoneFrame>
      ),
    }
  }
  if (phone) {
    return {
      kind: 'screen',
      screen: (
        <PhoneFrame>
          <Page
            back={{ label: 'Settings', to: routes.settingsList() }}
            subtitle={group}
            title={title}
          >
            {content}
          </Page>
        </PhoneFrame>
      ),
    }
  }
  // An org tab lies over a page of its own org.
  const sameOrg = route.screen !== 'settings' || belowOrgId === route.orgId
  const page =
    shown !== null && !isSettingsRoute(shown) && sameOrg ? shown : null
  const fallback: PageRoute = org
    ? { screen: 'org', orgId: org.id }
    : { screen: 'get-started' }
  const pageRoute = page ?? fallback
  const pageHref =
    page && below ? below : org ? routes.org(org.id) : routes.getStarted()
  return {
    kind: 'page',
    route: pageRoute,
    dialog: (
      <SettingsDialog
        close={() => go(pageHref)}
        group={group}
        groups={groups(tab)}
        title={title}
      >
        {content}
      </SettingsDialog>
    ),
  }
}
