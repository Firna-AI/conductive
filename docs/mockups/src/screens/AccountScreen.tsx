import type { SchemaProps, Viewport } from '@mokly/mokly'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import type { RailState } from '../components/layout/OrgRail'
import { Page } from '../components/layout/Page'
import { useMacApp } from '../components/mac/MacApp'
import {
  AccountTabs,
  AgentsSection,
  GitHubSection,
  SignInSection,
} from '../components/settings/AccountSections'
import { signInSteps } from '../components/settings/chatGptSignInCopy'
import { inviteStates } from '../components/settings/inviteCodeCopy'
import { InviteCodeSection } from '../components/settings/InviteCodeSection'
import { DefaultsSection } from '../components/settings/PreferencesSections'
import { ThisMacSection } from '../components/settings/ThisMacSection'
import { workspaceSections } from '../components/workspaces/sections'
import { Sidebar } from '../components/workspaces/Sidebar'
import { accountLogins, loginKinds } from '../fixtures/logins'
import { account, orgList, orgs } from '../fixtures/orgs'
import { viewerMembership } from '../fixtures/members'
import { paths } from '../paths'
import { agentsFor } from './accountAgents'

export const accountSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'tab',
    'connections',
    'codexLogin',
    'codexUse',
    'form',
    'codexSignIn',
    'view',
    'save',
    'shareChange',
    'invites',
    'openSignUp',
  ],
  properties: {
    /**
     * The tab: General, with the sign-in and the connections, or
     * Preferences. Each tab has its own address.
     */
    tab: { enum: ['general', 'preferences'] },
    /** GitHub and the agents are connected, or not yet, as at the first run. */
    connections: { enum: ['connected', 'not-connected'] },
    /** The kind of the Codex login while Codex is connected. */
    codexLogin: { enum: loginKinds },
    /**
     * Whether the app can still use the Codex login while Codex is
     * connected. A ChatGPT sign-in that OpenAI did not renew is not usable,
     * and its row shows the cause with Sign in again.
     */
    codexUse: { enum: ['usable', 'not-usable'] },
    /**
     * The Connect form that is open, and the kind that its switch selects:
     * the subscription token or the API key of Claude, or the API key or
     * the ChatGPT plan of Codex. Its agent is not connected yet, and the
     * other agent is.
     */
    form: {
      enum: ['none', 'claude', 'claude-api-key', 'codex', 'codex-token'],
    },
    /**
     * The step of the ChatGPT sign-in while the form of Codex has ChatGPT
     * plan selected: before the start, the code while the page waits for
     * the sign-in, the code expired, or the sign-in refused.
     */
    codexSignIn: { enum: signInSteps },
    /** How New workspace opens on a computer: as the page, or as a dialog. */
    view: { enum: ['page', 'dialog'] },
    /**
     * The save of the last change on Preferences: saved, or failed. A failed
     * save shows its error, and the choice keeps its saved value.
     */
    save: { enum: ['saved', 'failed'] },
    /**
     * The invite code of the user: invites left, sign-ups paused, every
     * invite used, or turned off by an operator.
     */
    invites: { enum: inviteStates },
    /**
     * Open sign-up: an operator turned off the waitlist, and sign-ups are
     * not paused, so anyone can sign up without an invite.
     */
    openSignUp: { enum: ['off', 'on'] },
    /**
     * The last change of a share setting: none, or a change of the Claude
     * login that the app did not save.
     */
    shareChange: { enum: ['none', 'not-saved'] },
  },
} as const

export type AccountState = SchemaProps<typeof accountSchema>

/**
 * The General tab of a connected account, with no form open: Claude with a
 * subscription token, and Codex with an API key.
 */
export const accountGeneral: AccountState = {
  tab: 'general',
  connections: 'connected',
  codexLogin: accountLogins.codex,
  codexUse: 'usable',
  form: 'none',
  codexSignIn: 'start',
  view: 'page',
  save: 'saved',
  shareChange: 'none',
  invites: 'left',
  openSignUp: 'off',
}

const connectedRail: RailState = { orgs: orgList, current: 'account' }

/** At the first run the rail has no org yet. */
const firstRunRail: RailState = { orgs: [], current: 'account', firstRun: true }

/**
 * The General tab: the GitHub sign-in, and what every org shares, the
 * GitHub App and the agents, then the invite code of the user, last, so
 * that a phone shows the form of an agent near the top. The Mac app adds
 * the This Mac section.
 */
function GeneralTab(props: { state: AccountState }) {
  const mac = useMacApp()
  return (
    <>
      <SignInSection />
      {mac ? <ThisMacSection /> : null}
      <GitHubSection connected={props.state.connections === 'connected'} />
      <AgentsSection {...agentsFor(props.state)} />
      <InviteCodeSection
        fresh={props.state.connections !== 'connected'}
        openSignUp={props.state.openSignUp === 'on'}
        state={props.state.invites}
      />
    </>
  )
}

/**
 * The account, in two tabs. General holds the GitHub sign-in, what every
 * org shares, and the invite code of the user. Preferences holds how new workspaces start: their model, and
 * how New workspace opens. The product is free, so the page shows no plan
 * and no billing, and the sandbox provider stays out of sight.
 */
export function AccountScreen(props: {
  state: AccountState
  viewport: Viewport
}) {
  const { state } = props
  const mac = useMacApp()
  const connected = state.connections === 'connected'
  const mobile = props.viewport === 'mobile'
  const back = connected
    ? { label: 'Workspaces', to: paths.shell }
    : { label: 'Get started', to: paths.getStarted }
  const page = (
    <Page
      back={mobile ? back : undefined}
      subtitle={`@${account.login}`}
      tabs={<AccountTabs tab={state.tab} />}
      title="Account"
      viewport={props.viewport}
    >
      {state.tab === 'general' ? (
        <GeneralTab state={state} />
      ) : (
        <DefaultsSection
          saveFailed={state.save === 'failed'}
          view={state.view}
        />
      )}
    </Page>
  )
  if (mobile) return <MobileFrame>{page}</MobileFrame>
  // The Mac app keeps the sidebar of the org beside the account.
  const sidebar = mac ? (
    <Sidebar
      org={orgs.acme}
      sections={workspaceSections(undefined, mac.needsInput)}
      viewer={viewerMembership('admin')}
    />
  ) : undefined
  return (
    <AppFrame rail={connected ? connectedRail : firstRunRail} sidebar={sidebar}>
      {page}
    </AppFrame>
  )
}
