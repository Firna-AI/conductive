import { useEffect, type ReactNode } from 'react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { CircleAlert } from 'lucide-react'
import { EmptyState } from '../../docs/mockups/src/components/common/EmptyState'
import { inFirstRun } from '../app/get-started'
import { setupOrg } from '../app/setup-steps'
import { useNavigation, useRoute } from '../app/navigation'
import { routes, type Route } from '../app/router'
import { useStore } from '../app/store'
import type { User } from '../shared/api'
import { AccountScreen } from './account/AccountScreen'
import { SignInScreen } from './auth/SignInScreen'
import { useApp } from './context'
import { InvitationsScreen } from './invitations/InvitationsScreen'
import { PhoneFrame, StandaloneFrame } from './layout/frames'
import { Sidebar } from './list/Sidebar'
import { useKeptOrg } from './mac/mac-app'
import { GetStartedScreen } from './onboarding/GetStartedScreen'
import { OperatorRoutes } from './operator/OperatorRoutes'
import { CreateOrgScreen } from './orgs/CreateOrgScreen'
import { NotAvailable, OrgRoutes, RailFrame } from './OrgRoutes'
import { ActionButton } from './ui/actions'
import { useViewport } from './ui/viewport'
import ui from './ui/ui.module.css'

/**
 * A page alone in the window: a phone frame, or a desktop page without the
 * rail.
 */
function Alone(props: { children: ReactNode }) {
  if (useViewport() === 'phone')
    return <PhoneFrame>{props.children}</PhoneFrame>
  return <StandaloneFrame>{props.children}</StandaloneFrame>
}

/** The wait of the first load, as the app shows it. */
function Loading() {
  const theme = useSharedUiTheme()
  return (
    <Alone>
      <div className={ui.center}>
        <Spinner
          accessibilityLabel="Loading"
          color={theme.colors.muted}
          size={16}
        />
      </div>
    </Alone>
  )
}

/**
 * The app opens as usual: Get started, or the org of Get started. That is
 * the first org that is not deleted, else a deleted one, whose page offers
 * Restore.
 */
function OpenApp() {
  const app = useApp()
  const navigation = useNavigation()
  const orgs = useStore(app.orgs)
  const getStarted = useStore(app.getStarted)
  const first = setupOrg(orgs)
  const target =
    inFirstRun(getStarted) || !first
      ? routes.getStarted()
      : routes.org(first.id)
  useEffect(() => navigation.replace(target), [navigation, target])
  return null
}

/**
 * The address `/`, also with the `?invite=` of an invitation email. The
 * invitations that wait for the user show first, in the frame of the app,
 * until the user accepts one or continues. Without one, the app opens as
 * usual. Nothing else waits for the invitations.
 */
function Home(props: { user: User }) {
  const { invitations } = useApp()
  const state = useStore(invitations.state)
  const phone = useViewport() === 'phone'
  useEffect(() => invitations.open(), [invitations])
  const { list } = state
  if (state.passed) return <OpenApp />
  if (list === null || list.state === 'loading') return <Loading />
  if (list.state === 'ready' && list.value.length === 0) return <OpenApp />
  const page = <InvitationsScreen user={props.user} />
  if (phone) return <PhoneFrame>{page}</PhoneFrame>
  return (
    <RailFrame current={null} user={props.user}>
      {page}
    </RailFrame>
  )
}

type AccountRoute = Extract<Route, { screen: 'account' }>

/** The account. The Mac app keeps the sidebar of an org beside it. */
function Account(props: { route: AccountRoute; user: User }) {
  const phone = useViewport() === 'phone'
  const org = useKeptOrg(useStore(useApp().orgs))
  const page = (
    <AccountScreen
      connect={props.route.connect}
      tab={props.route.tab}
      user={props.user}
    />
  )
  if (phone) return <PhoneFrame>{page}</PhoneFrame>
  return (
    <RailFrame
      current="account"
      sidebar={org ? <Sidebar current={null} org={org} /> : undefined}
      user={props.user}
    >
      {page}
    </RailFrame>
  )
}

function Signed(props: { route: Route; user: User }) {
  const { route, user } = props
  const phone = useViewport() === 'phone'
  const inRail = (page: ReactNode, current: 'account' | null) =>
    phone ? (
      <PhoneFrame>{page}</PhoneFrame>
    ) : (
      <RailFrame current={current} user={user}>
        {page}
      </RailFrame>
    )
  switch (route.screen) {
    case 'home':
      return <Home user={user} />
    case 'get-started':
      return inRail(<GetStartedScreen user={user} />, null)
    case 'account':
      return <Account route={route} user={user} />
    case 'create-org':
      return (
        <Alone>
          <CreateOrgScreen first={route.first} />
        </Alone>
      )
    case 'operator':
      return <OperatorRoutes user={user} view={route.view} />
    case 'not-found':
      return inRail(<NotAvailable title="This page is not available" />, null)
    default:
      return <OrgRoutes route={route} user={user} />
  }
}

/**
 * The web app: the first load, the sign-in, and the screen of the address.
 * Get started is the only first run.
 */
export function Shell() {
  const app = useApp()
  const boot = useStore(app.boot)
  const route = useRoute()
  useEffect(() => app.ensureStarted(), [app])
  switch (boot.state) {
    case 'loading':
      return <Loading />
    case 'signed-out':
      return (
        <Alone>
          <SignInScreen />
        </Alone>
      )
    case 'failed':
      return (
        <Alone>
          <EmptyState
            action={
              <ActionButton onPress={() => void app.start()} tone="primary">
                Try again
              </ActionButton>
            }
            body={boot.error.message}
            icon={CircleAlert}
            title="The app didn't load"
          />
        </Alone>
      )
    case 'ready':
      return <Signed route={route} user={boot.user} />
  }
}
