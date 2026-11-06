import { useEffect, type ReactNode } from 'react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { CircleAlert } from 'lucide-react'
import { EmptyState } from '../../docs/mockups/src/components/common/EmptyState'
import { inFirstRun } from '../app/get-started'
import { useNavigation, useRoute } from '../app/navigation'
import { routes, type Route } from '../app/router'
import { useStore } from '../app/store'
import type { User } from '../shared/api'
import { AccountScreen } from './account/AccountScreen'
import { SignInScreen } from './auth/SignInScreen'
import { useApp } from './context'
import { PhoneFrame } from './layout/frames'
import layout from './layout/layout.module.css'
import { GetStartedScreen } from './onboarding/GetStartedScreen'
import { CreateOrgScreen } from './orgs/CreateOrgScreen'
import { NotAvailable, OrgRoutes, RailFrame } from './OrgRoutes'
import { ActionButton } from './ui/actions'
import { OverlayHost } from './ui/Overlay'
import { useViewport } from './ui/viewport'
import ui from './ui/ui.module.css'

/** A page alone in the window: a phone frame, or a desktop page without the rail. */
function Alone(props: { children: ReactNode }) {
  if (useViewport() === 'phone')
    return <PhoneFrame>{props.children}</PhoneFrame>
  return (
    <div className={layout.standalone}>
      <OverlayHost>{props.children}</OverlayHost>
    </div>
  )
}

/** The address `/` goes to Get started, or to the first org of the user. */
function Home() {
  const app = useApp()
  const navigation = useNavigation()
  const orgs = useStore(app.orgs)
  const getStarted = useStore(app.getStarted)
  const first = orgs.find((org) => !org.deletion) ?? orgs[0]
  const target =
    inFirstRun(getStarted) || !first
      ? routes.getStarted()
      : routes.org(first.id)
  useEffect(() => navigation.replace(target), [navigation, target])
  return null
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
      return <Home />
    case 'get-started':
      return inRail(<GetStartedScreen user={user} />, null)
    case 'account':
      return inRail(
        <AccountScreen connect={route.connect} user={user} />,
        'account',
      )
    case 'create-org':
      return (
        <Alone>
          <CreateOrgScreen first={route.first} />
        </Alone>
      )
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
  const theme = useSharedUiTheme()
  useEffect(() => app.ensureStarted(), [app])
  switch (boot.state) {
    case 'loading':
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
