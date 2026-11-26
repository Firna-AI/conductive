import { useEffect, type ReactNode } from 'react'
import { routeOf } from '../../app/navigation'
import { paletteOrg } from '../../app/palette/palette-org'
import { routeOrgId, routes, type Route } from '../../app/router'
import { isSettingsRoute, type SettingsRoute } from '../../app/settings-route'
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

/**
 * The tab that a route of Settings shows. The list shows General on a
 * desktop. Only the Mac app has This Mac, so a browser shows General at its
 * address, and the title, the open row, and the content all follow it.
 */
function tabRouteOf(route: SettingsRoute, mac: boolean): TabRoute {
  if (route.screen === 'settings-list') {
    return { screen: 'account', tab: 'general', connect: null }
  }
  if (route.screen === 'account' && route.tab === 'this-mac' && !mac) {
    return { ...route, tab: 'general' }
  }
  return route
}

/** The content of the tab of a route. */
function TabContent(props: {
  route: TabRoute
  org: OrgSummary | null
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

/** The org of a page among the active orgs, the orgs that are not deleted. */
function ownOrg(route: Route, active: readonly OrgSummary[]) {
  const orgId = routeOrgId(route)
  return active.find((org) => org.id === orgId) ?? null
}

/**
 * The page below Settings: the last page of the tab, when it has no org of
 * its own or the org of an org tab, and the address that Close opens.
 * Without one, it is the workspace list of the org, or Get started.
 */
function pageBelow(
  shown: { route: PageRoute; href: string } | null,
  orgs: readonly OrgSummary[],
  tabOrg: OrgSummary | null,
  orgTab: boolean,
): { route: PageRoute; href: string } {
  const own = shown === null ? null : ownOrg(shown.route, orgs)
  if (shown !== null && (!orgTab || own === null || own.id === tabOrg?.id)) {
    return shown
  }
  if (tabOrg) {
    return {
      route: { screen: 'org', orgId: tabOrg.id },
      href: routes.org(tabOrg.id),
    }
  }
  return { route: { screen: 'get-started' }, href: routes.getStarted() }
}

/**
 * Settings at its address. A desktop shows the page below with the
 * Settings dialog over it, as `pageBelow` says. A phone shows the list of
 * the tabs at `/settings`, and each tab as a screen of its own. The org of
 * the org settings is the org of an org tab, else the org that the page
 * below works on, as the command palette does. An org tab makes its org
 * the org that the tab opened last. An address of an org that the person
 * cannot open, or a deleted org, shows the page of that org. Any other
 * address shows its page, without a dialog.
 */
export function useSettingsView(
  route: Route,
  below: string | null,
  user: User,
): SettingsView {
  const app = useApp()
  const all = useStore(app.orgs)
  const active = useStore(app.activeOrgs)
  const lastOrg = useStore(app.lastOrg)
  const phone = useViewport() === 'phone'
  const mac = useMacApp() !== null
  const go = useGo()
  const tabOrgId = route.screen === 'settings' ? route.orgId : null
  useEffect(() => {
    if (tabOrgId !== null) app.openOrg(tabOrgId)
  }, [app, tabOrgId])
  if (!isSettingsRoute(route)) return { kind: 'page', route, dialog: null }
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
  const last = below === null ? null : routeOf(below)
  const shown =
    last === null || isSettingsRoute(last) || below === null
      ? null
      : { route: last, href: below }
  const org =
    route.screen === 'settings'
      ? ownOrg(route, active)
      : paletteOrg(shown?.route ?? { screen: 'home' }, active, lastOrg)
  const tab = tabRouteOf(route, mac)
  const groups = (selected: TabRoute | null) =>
    settingsGroups({ route: selected, org, mac })
  const content = <TabContent org={org} route={tab} user={user} />
  const { title, group } = tabTitle(tab, org)
  if (phone) {
    const screen =
      route.screen === 'settings-list' ? (
        <Page
          back={{
            label: 'Workspaces',
            to: org ? routes.org(org.id) : routes.home(),
          }}
          title="Settings"
        >
          <SettingsNav groups={groups(null)} variant="touch" />
        </Page>
      ) : (
        <Page
          back={{ label: 'Settings', to: routes.settingsList() }}
          subtitle={group}
          title={title}
        >
          {content}
        </Page>
      )
    return { kind: 'screen', screen: <PhoneFrame>{screen}</PhoneFrame> }
  }
  const page = pageBelow(shown, active, org, route.screen === 'settings')
  return {
    kind: 'page',
    route: page.route,
    dialog: (
      <SettingsDialog
        close={() => go(page.href)}
        group={group}
        groups={groups(tab)}
        title={title}
      >
        {content}
      </SettingsDialog>
    ),
  }
}
