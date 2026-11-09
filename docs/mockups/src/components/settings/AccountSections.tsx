import { useId } from 'react'
import { ArrowUpRight, LogOut } from 'lucide-react'
import {
  agentKeys,
  agents,
  defaultChoice,
  type AgentKey,
} from '../../fixtures/agents'
import {
  loginLabels,
  shareNotSavedCause,
  sharedByDefault,
  type AgentLogins,
  type LoginKind,
} from '../../fixtures/logins'
import { account, installations } from '../../fixtures/orgs'
import { noop } from '../../noop'
import { ModelPicker } from '../chat/ModelPicker'
import { ActionButton } from '../common/actions'
import { classes } from '../common/classes'
import { AccountAvatar } from '../orgs/OrgTile'
import { StatusText } from '../common/StatusText'
import { AgentConnectForm } from './AgentConnectForm'
import { LoginShare } from './LoginShare'
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

/**
 * The share setting under each connected login, as on the account. Each
 * login shows the value that a new login of its agent and kind starts with.
 * `notSaved` names the agent whose last change the app did not save.
 */
type LoginShares = { notSaved: AgentKey | null }

/** The Connect form that is open under the row of an agent. */
export type OpenAgentForm = {
  agent: AgentKey
  /** The kind that its switch selects, by default the first of the agent. */
  kind?: LoginKind
  connectTo: string
  /** The form can close, because it did not open as the next step. */
  cancel: boolean
}

/**
 * Claude and Codex, each with Connect, or Connected and the kind of its
 * login. `form` opens the Connect form of an agent under its row.
 * `removable` gives each connected login its Remove, and `shares` its
 * share setting, as on the account.
 */
export function AgentList(props: {
  logins: AgentLogins
  form?: OpenAgentForm
  removable?: boolean
  shares?: LoginShares
}) {
  const ids = useId()
  return (
    <ul aria-label="Agents" className={classes(styles.list, styles.agentList)}>
      {agentKeys.map((key) => {
        const login = props.logins[key]
        const form = props.form?.agent === key ? props.form : undefined
        const nameId = `${ids}-${key}`
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
            <div className={classes(styles.row, styles.agentRow)}>
              <span className={styles.name} id={nameId}>
                {agents[key].name}
              </span>
              <span className={styles.detail}>
                {login ? (
                  <>
                    {connected}
                    <span className={styles.kind}>
                      {loginLabels[key][login]}
                    </span>
                  </>
                ) : null}
              </span>
              {action}
            </div>
            {login && props.shares ? (
              <LoginShare
                error={
                  props.shares.notSaved === key ? shareNotSavedCause : null
                }
                nameId={nameId}
                onChange={noop}
                shared={sharedByDefault[key][login]}
              />
            ) : null}
            {form && !login ? (
              <AgentConnectForm
                agent={key}
                cancel={form.cancel}
                connectTo={form.connectTo}
                kind={form.kind}
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
 * with its kind, Remove, and its share setting, or Connect, which opens the
 * form of the agent.
 */
export function AgentsSection(props: {
  logins: AgentLogins
  form?: OpenAgentForm
  shares: LoginShares
}) {
  return (
    <Section description="Every org uses these agents." title="Agents">
      <AgentList
        form={props.form}
        logins={props.logins}
        removable
        shares={props.shares}
      />
    </Section>
  )
}

/** The model and the effort that new workspaces start with. */
export function DefaultsSection() {
  return (
    <Section
      description="New workspaces start with these. Each message can change them."
      title="New workspaces"
    >
      <div className={styles.defaults}>
        <span className={styles.defaultsLabel}>Model and effort</span>
        <ModelPicker choice={defaultChoice} />
      </div>
    </Section>
  )
}
