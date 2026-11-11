import { useEffect, type ReactNode } from 'react'
import { SearchX } from 'lucide-react'
import { EmptyState } from '../../docs/mockups/src/components/common/EmptyState'
import type { Route } from '../app/router'
import { routes } from '../app/router'
import { useStore } from '../app/store'
import type { User } from '../shared/api'
import type { OrgSummary } from '../shared/orgs'
import { useApp } from './context'
import { AppFrame, PhoneFrame } from './layout/frames'
import { OrgRail, type RailCurrent } from './layout/OrgRail'
import { DeletedOrg, OrgHome } from './list/OrgHome'
import { HomeList, ListHeader } from './list/HomeList'
import { Sidebar, type ListCurrent } from './list/Sidebar'
import { ConductorImportScreen } from './import/ConductorImportScreen'
import { ImportOfferBar } from './import/ImportOfferBar'
import { NewWorkspaceScreen } from './new-workspace/NewWorkspaceScreen'
import { RoutineScreen } from './routines/RoutineScreen'
import { RoutinesScreen } from './routines/RoutinesScreen'
import { OrgSettingsScreen } from './settings/OrgSettingsScreen'
import { ActionButton } from './ui/actions'
import { useGo } from './ui/AppLink'
import { useViewport } from './ui/viewport'
import { WorkspaceScreen } from './workspace/WorkspaceScreen'
import { inFirstRun } from '../app/get-started'

/**
 * The desktop frame with the rail of the user's orgs. The rail of an
 * operator also leads to the operator section.
 */
export function RailFrame(props: {
  user: User
  current: RailCurrent
  sidebar?: ReactNode
  children: ReactNode
}) {
  const app = useApp()
  const orgs = useStore(app.orgs)
  const getStarted = useStore(app.getStarted)
  const operator = useStore(app.account.account)?.operator === true
  return (
    <AppFrame
      rail={
        <OrgRail
          current={props.current}
          firstRun={inFirstRun(getStarted)}
          operator={operator}
          orgs={orgs}
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

type OrgRoute = Extract<Route, { orgId: string }>

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
          view={route.view}
          viewer={user}
          workspaceId={route.workspaceId}
        />
      )
    case 'settings':
      return <OrgSettingsScreen org={org} tab={route.tab} user={user} />
    case 'conductor-import':
      return <ConductorImportScreen key={org.id} org={org} />
    case 'routines':
      return <RoutinesScreen org={org} />
    case 'new-routine':
      return (
        <RoutineScreen
          key={`${org.id}:new-routine`}
          org={org}
          routineId={null}
          tab="routine"
          user={user}
        />
      )
    case 'routine':
      return (
        <RoutineScreen
          key={`${org.id}:${route.routineId}`}
          org={org}
          routineId={route.routineId}
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
    case 'settings':
      return { screen: 'settings' }
    case 'conductor-import':
      return null
    case 'routines':
    case 'new-routine':
    case 'routine':
      return { screen: 'routines' }
  }
}

/** The screens of one org, in the desktop frame or the phone frame. */
export function OrgRoutes(props: { route: OrgRoute; user: User }) {
  const app = useApp()
  const phone = useViewport() === 'phone'
  const org = useStore(app.orgs).find((item) => item.id === props.route.orgId)
  const current: RailCurrent = { org: props.route.orgId }
  // A page without an org, such as the Account page, works on the last org.
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
      sidebar={
        <Sidebar
          current={listCurrent(props.route)}
          org={org}
          user={props.user}
        />
      }
      user={props.user}
    >
      {props.route.screen === 'conductor-import' ? null : (
        <ImportOfferBar org={org} />
      )}
      {screen ?? <OrgHome org={org} user={props.user} />}
    </RailFrame>
  )
}
