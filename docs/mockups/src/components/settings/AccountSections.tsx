import { ArrowUpRight, LogOut } from 'lucide-react'
import type { AgentLogins } from '../../fixtures/logins'
import { account, installations } from '../../fixtures/orgs'
import type { ShortcutHost } from '../../fixtures/shortcutHosts'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { LinkTabs, type LinkTab } from '../common/LinkTabs'
import { AccountAvatar } from '../orgs/OrgTile'
import {
  AgentList,
  connected,
  type LoginShares,
  type OpenAgentForm,
} from './AgentList'
import type { UnusableLogin } from './LoginNotUsable'
import type { OrgLoginUse } from './OrgLoginLines'
import { Section } from './Section'
import { shortcutPages } from './shortcutPages'
import styles from './AccountSections.module.css'

/** The person signed in, with GitHub, and the way to sign out. */
export function SignInSection() {
  return (
    <section aria-label="Sign-in" className={styles.signIn}>
      <AccountAvatar size={32} />
      <span className={styles.signInText}>
        Signed in with GitHub as{' '}
        <span className={styles.login}>@{account.login}</span>
      </span>
      <ActionButton icon={LogOut}>Sign out</ActionButton>
    </section>
  )
}

/** The shared GitHub App, and the accounts where it is installed. */
export function GitHubSection(props: { connected: boolean }) {
  if (!props.connected) {
    return (
      <Section
        actions={
          <ActionButton icon={ArrowUpRight} tone="primary">
            Install the GitHub App
          </ActionButton>
        }
        description="Install the GitHub App on the accounts whose repositories your orgs use."
        title="GitHub"
      />
    )
  }
  return (
    <Section
      actions={
        <ActionButton icon={ArrowUpRight}>Manage on GitHub</ActionButton>
      }
      description="Each org chooses its repositories from these accounts."
      status={connected}
      title="GitHub"
    >
      <ul aria-label="GitHub accounts" className={styles.list}>
        {installations.map((item) => (
          <li className={styles.row} key={item.account}>
            <span className={styles.name}>{item.account}</span>
            <span className={styles.detail}>
              {item.repositories} repositories
            </span>
          </li>
        ))}
      </ul>
    </Section>
  )
}

/**
 * The agents that every org uses, Claude and Codex: each connected login
 * with its kind, the host of an own endpoint, Remove, and its share setting,
 * or Connect, which opens the form of the agent.
 * `unusable` names a login that the app can no longer
 * use. `orgLogins` names, under an agent, each org whose org login serves
 * the new sessions of the user (decisions 4 and 7 B of the org logins plan).
 */
export function AgentsSection(props: {
  logins: AgentLogins
  form?: OpenAgentForm
  shares: LoginShares
  unusable?: UnusableLogin
  orgLogins?: OrgLoginUse
}) {
  return (
    <Section description="Every org uses these agents." title="Agents">
      <AgentList
        form={props.form}
        logins={props.logins}
        orgLogins={props.orgLogins}
        removable
        shares={props.shares}
        unusable={props.unusable}
      />
    </Section>
  )
}

/** The pages of the account. */
export type AccountTab =
  'general' | 'agents' | 'preferences' | 'shortcuts' | 'this-mac'

/**
 * The pages of the account, as tabs that link to each one: General, with
 * the sign-in, GitHub, and the invite code, Agents, with the logins of
 * Claude and Codex, Preferences, and Keyboard shortcuts.
 * Keyboard shortcuts links to the tab of the host. The Mac app adds This
 * Mac last. `flow` moves a tab that
 * does not fit to a second line, for a phone.
 */
export function AccountTabs(props: {
  tab: AccountTab
  host: ShortcutHost
  flow?: boolean
}) {
  const tabs: LinkTab[] = [
    {
      label: 'General',
      to: paths.account,
      selected: props.tab === 'general',
    },
    {
      label: 'Agents',
      to: paths.accountAgents,
      selected: props.tab === 'agents',
    },
    {
      label: 'Preferences',
      to: paths.accountPreferences,
      selected: props.tab === 'preferences',
    },
    {
      label: 'Keyboard shortcuts',
      to: shortcutPages[props.host].tab,
      selected: props.tab === 'shortcuts',
    },
  ]
  if (props.host === 'mac-app') {
    tabs.push({
      label: 'This Mac',
      to: paths.thisMac,
      selected: props.tab === 'this-mac',
    })
  }
  return <LinkTabs flow={props.flow} label="Account" tabs={tabs} />
}
