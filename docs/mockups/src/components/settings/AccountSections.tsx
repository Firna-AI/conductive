import { ArrowUpRight, LogOut } from 'lucide-react'
import { agentKeys, agents, type AgentKey } from '../../fixtures/agents'
import { loginLabels, type AgentLogins } from '../../fixtures/logins'
import { account, installations } from '../../fixtures/orgs'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { LinkTabs } from '../common/LinkTabs'
import { AccountAvatar } from '../orgs/OrgTile'
import { StatusText } from '../common/StatusText'
import { AgentConnectForm } from './AgentConnectForm'
import { Section } from './Section'
import styles from './AccountSections.module.css'

const connected = <StatusText label="Connected" tone="success" />

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

/** The Connect form that is open under the row of an agent. */
export type OpenAgentForm = {
  agent: AgentKey
  connectTo: string
  /** The form can close, because it did not open as the next step. */
  cancel: boolean
}

/**
 * Claude and Codex, each with Connect, or Connected and the kind of its
 * login. `form` opens the Connect form of an agent under its row.
 * `removable` gives each connected login its Remove, as on the account.
 */
export function AgentList(props: {
  logins: AgentLogins
  form?: OpenAgentForm
  removable?: boolean
}) {
  return (
    <ul aria-label="Agents" className={styles.list}>
      {agentKeys.map((key) => {
        const login = props.logins[key]
        const form = props.form?.agent === key ? props.form : undefined
        let action = form ? null : <ActionButton>Connect</ActionButton>
        if (login) {
          action = props.removable ? (
            <ActionButton
              accessibilityLabel={`Remove ${agents[key].name}`}
              tone="plain"
            >
              Remove
            </ActionButton>
          ) : null
        }
        return (
          <li key={key}>
            <div className={styles.row}>
              <span className={styles.name}>{agents[key].name}</span>
              <span className={styles.detail}>
                {login ? (
                  <>
                    {connected}
                    <span className={styles.kind}>{loginLabels[login]}</span>
                  </>
                ) : null}
              </span>
              {action}
            </div>
            {form && !login ? (
              <AgentConnectForm
                agent={key}
                cancel={form.cancel}
                connectTo={form.connectTo}
              />
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

/**
 * The agents that every org uses, Claude and Codex: each connected login
 * with its kind and Remove, or Connect, which opens the form of the agent.
 */
export function AgentsSection(props: {
  logins: AgentLogins
  form?: OpenAgentForm
}) {
  return (
    <Section description="Every org uses these agents." title="Agents">
      <AgentList form={props.form} logins={props.logins} removable />
    </Section>
  )
}

/** The two pages of the account. */
export type AccountTab = 'general' | 'preferences'

/**
 * The pages of the account, as tabs that link to each one: General, with
 * the sign-in and the connections, and Preferences.
 */
export function AccountTabs(props: { tab: AccountTab }) {
  return (
    <LinkTabs
      label="Account"
      tabs={[
        {
          label: 'General',
          to: paths.account,
          selected: props.tab === 'general',
        },
        {
          label: 'Preferences',
          to: paths.accountPreferences,
          selected: props.tab === 'preferences',
        },
      ]}
    />
  )
}
