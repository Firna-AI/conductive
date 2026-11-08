import { useMemo } from 'react'
import { routes } from '../../app/router'
import { useServices } from '../../app/services'
import { ThisMacSection } from '../../chat/device/ThisMacSection'
import type { Agent } from '../../shared/agents'
import type { User } from '../../shared/api'
import { Page } from '../layout/Page'
import { useMacApp } from '../mac/mac-app'
import { useViewport } from '../ui/viewport'
import {
  AgentsSection,
  DefaultsSection,
  SignInSection,
} from './AccountSections'
import { GitHubSection } from './GitHubSection'

/**
 * This Mac, in the account of the Mac app only: the Mac that the app
 * registers, the commands that always run on it, and the 15 minutes of
 * each workspace. A browser has no Mac, so it draws nothing and sends no
 * request.
 */
function ThisMac() {
  const services = useServices()
  const clock = useMemo(() => ({ now: services.now }), [services])
  const viewport = useViewport()
  if (!useMacApp()) return null
  return (
    <ThisMacSection
      client={services.api}
      clock={clock}
      viewport={viewport === 'phone' ? 'mobile' : 'desktop'}
    />
  )
}

/**
 * The account: the GitHub sign-in, and what every org shares. The GitHub
 * App, the agents, and the model of new workspaces. The Mac app adds This
 * Mac. The product is free, so the page shows no plan and no billing.
 * `connect` opens the Connect form of an agent at first, as the link of a
 * missing login does.
 */
export function AccountScreen(props: { user: User; connect: Agent | null }) {
  return (
    <Page
      back={{ label: 'Workspaces', to: routes.home() }}
      subtitle={`@${props.user.githubLogin}`}
      title="Account"
    >
      <SignInSection user={props.user} />
      <ThisMac />
      <GitHubSection />
      <AgentsSection connect={props.connect} />
      <DefaultsSection />
    </Page>
  )
}
