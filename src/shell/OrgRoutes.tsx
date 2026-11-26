import { useEffect, type ReactNode } from 'react'
import { SearchX } from 'lucide-react'
import { EmptyState } from '../ui/components/common/EmptyState'
import { routes, type Route } from '../app/router'
import type { SettingsRoute } from '../app/settings-route'
import { useStore } from '../app/store'
import type { User } from '../shared/api'
import type { OrgSummary } from '../shared/orgs'
import { useApp } from './context'
import { AppFrame, PhoneFrame } from './layout/frames'
import { OrgRail, type RailCurrent } from './layout/OrgRail'
import { DeletedOrg, OrgHome } from './list/OrgHome'
import { HomeList, ListHeader } from './list/HomeList'
import { Sidebar, type ListCurrent } from './list/Sidebar'
import { NewWorkspaceScreen } from './new-workspace/NewWorkspaceScreen'
import { AutomationScreen } from './automations/AutomationScreen'
import { AutomationsScreen } from './automations/AutomationsScreen'
import { useShortcutOffer } from './shortcuts/shortcut-context'
import { ActionButton } from './ui/actions'
import { useGo, useOpenPage } from './ui/AppLink'
import { useViewport } from './ui/viewport'
import { WorkspaceScreen } from './workspace/WorkspaceScreen'
import { inFirstRun } from '../app/get-started'

/**
 * The desktop frame with the rail of the user's orgs that are not deleted,
 * from `AppModel.activeOrgs`. The rail of an operator also leads to the
 * operator section.
 */
export function RailFrame(props: {
  user: User
  current: RailCurrent
  sidebar?: ReactNode
  /** The page is the list page of the current org. */
  listPage?: boolean
  children: ReactNode
}) {
  const app = useApp()
  const orgs = useStore(app.activeOrgs)
  const getStarted = useStore(app.getStarted)
  const operator = useStore(app.account.account)?.operator === true
  return (
    <AppFrame
      rail={
        <OrgRail
          current={props.current}
          firstRun={inFirstRun(getStarted)}
          listPage={props.listPage}
          operator={operator}
          orgs={orgs}
          sidebar={props.sidebar}
          user={props.user}
        />
      }
      sidebar={props.sidebar}
    >
      {props.children}
    </AppFrame>
  )
}

/** An address that names no org of the user, or nothing at all. */
export function NotAvailable(props: { title: string }) {
  const go = useGo()
  return (
    <EmptyState
      action={
        <ActionButton onPress={() => go(routes.home())} tone="primary">
          Open your workspaces
        </ActionButton>
      }
      icon={SearchX}
      title={props.title}
    />
  )
}

type OrgRoute = Exclude<Extract<Route, { orgId: string }>, SettingsRoute>

function screenOf(route: OrgRoute, org: OrgSummary, user: User): ReactNode {
  switch (route.screen) {
    case 'org':
      return null
    case 'new-workspace':
      return (
        <NewWorkspaceScreen
          key={`${org.id}:${route.sectionId ?? ''}`}
          org={org}
          sectionId={route.sectionId}
        />
      )
    case 'workspace':
      return (
        <WorkspaceScreen
          key={`${org.id}:${route.workspaceId}`}
          org={org}
          session={route.session}
          view={route.view}
          viewer={user}
          workspaceId={route.workspaceId}
        />
      )
    case 'automations':
      return <AutomationsScreen org={org} />
    case 'new-automation':
      return (
        <AutomationScreen
          key={`${org.id}:new-automation`}
          org={org}
          automationId={null}
          tab="automation"
          user={user}
        />
      )
    case 'automation':
      return (
        <AutomationScreen
          key={`${org.id}:${route.automationId}`}
          org={org}
          automationId={route.automationId}
          tab={route.tab}
          user={user}
        />
      )
  }
}

function listCurrent(route: OrgRoute): ListCurrent {
  switch (route.screen) {
    case 'org':
      return null
    case 'new-workspace':
      return { screen: 'new-workspace' }
    case 'workspace':
      return { screen: 'workspace', workspaceId: route.workspaceId }
    case 'automations':
    case 'new-automation':
    case 'automation':
      return { screen: 'automations' }
  }
}

/**
 * The screens of one org, in the desktop frame or the phone frame. Each
 * page of an org that is not deleted takes the key of Workspace list,
 * which opens the list page of the org.
 */
export function OrgRoutes(props: { route: OrgRoute; user: User }) {
  const app = useApp()
  const phone = useViewport() === 'phone'
  const open = useOpenPage()
  const org = useStore(app.orgs).find((item) => item.id === props.route.orgId)
  const current: RailCurrent = { org: props.route.orgId }
  const listOrg = org && !org.deletion ? org.id : null
  useShortcutOffer(
    'workspace-list',
    listOrg === null ? null : () => open(routes.org(listOrg)),
  )
  // A page without an org, such as Get started, works on the last org.
  useEffect(() => {
    app.openOrg(props.route.orgId)
  }, [app, props.route.orgId])
  if (!org) {
    const page = <NotAvailable title="This org is not available" />
    if (phone) return <PhoneFrame>{page}</PhoneFrame>
    return (
      <RailFrame current={current} user={props.user}>
        {page}
      </RailFrame>
    )
  }
  if (org.deletion) {
    if (phone) {
      return (
        <PhoneFrame>
          <ListHeader org={org} settings={false} user={props.user} />
          <DeletedOrg org={org} />
        </PhoneFrame>
      )
    }
    return (
      <RailFrame current={current} user={props.user}>
        <DeletedOrg org={org} />
      </RailFrame>
    )
  }
  const screen = screenOf(props.route, org, props.user)
  if (phone) {
    return (
      <PhoneFrame>
        {screen ?? <HomeList org={org} user={props.user} />}
      </PhoneFrame>
    )
  }
  return (
    <RailFrame
      current={current}
      listPage={screen === null}
      sidebar={
        <Sidebar
          current={listCurrent(props.route)}
          org={org}
          user={props.user}
        />
      }
      user={props.user}
    >
      {screen ?? <OrgHome org={org} user={props.user} />}
    </RailFrame>
  )
}
