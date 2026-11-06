import { routes } from '../../app/router'
import type { Agent } from '../../shared/agents'
import type { User } from '../../shared/api'
import { Page } from '../layout/Page'
import {
  AgentsSection,
  DefaultsSection,
  SignInSection,
} from './AccountSections'
import { GitHubSection } from './GitHubSection'

/**
 * The account: the GitHub sign-in, and what every org shares. The GitHub
 * App, the agents, and the model of new workspaces. The product is free,
 * so the page shows no plan and no billing. `connect` opens the Connect
 * form of an agent at first, as the link of a missing login does.
 */
export function AccountScreen(props: { user: User; connect: Agent | null }) {
  return (
    <Page
      back={{ label: 'Workspaces', to: routes.home() }}
      subtitle={`@${props.user.githubLogin}`}
      title="Account"
    >
      <SignInSection user={props.user} />
      <GitHubSection />
      <AgentsSection connect={props.connect} />
      <DefaultsSection />
    </Page>
  )
}
