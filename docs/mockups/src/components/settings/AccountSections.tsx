import { useId } from 'react'
import { agentKeys, agents, type AgentKey } from '../../fixtures/agents'
import {
  loginLabels,
  shareNotSavedCause,
  sharedByDefault,
  type AgentLogins,
  type LoginKind,
} from '../../fixtures/logins'
import { account, installations } from '../../fixtures/orgs'
import { actionButton } from '../../entries/components/common/actions.mockup'
import { classes } from '../common/classes'
import { accountAvatar } from '../../entries/components/orgs/OrgTile.mockup'
import { statusText } from '../../entries/components/common/StatusText.mockup'
import { agentConnectForm } from '../../entries/components/settings/AgentConnectForm.mockup'
import { endpointDetails } from '../../entries/components/settings/EndpointDetails.mockup'
import type { EndpointEntry } from './EndpointFields'
import type { SignInStep } from './chatGptSignInCopy'
import {
  loginNotUsable,
  signedOutStatus,
} from '../../entries/components/settings/LoginNotUsable.mockup'
import type { UnusableLogin } from './LoginNotUsable'
import { loginShare } from '../../entries/components/settings/LoginShare.mockup'
import { section } from '../../entries/components/settings/Section.mockup'
import { defined } from '../../defined'
import styles from './AccountSections.module.css'

/** The state of a connected app or login. `name` names it for Mokly. */
function Connected(props: { name: string }) {
  return (
    <statusText.Component
      label="Connected"
      moklyInstance={props.name}
      tone="success"
    />
  )
}

/** The person signed in, with GitHub, and the way to sign out. */
export function SignInSection() {
  return (
    <section aria-label="Sign-in" className={styles.signIn}>
      <accountAvatar.Component moklyInstance="sign-in-avatar" size={32} />
      <span className={styles.signInText}>
        Signed in with GitHub as{' '}
        <span className={styles.login}>@{account.login}</span>
      </span>
      <actionButton.Component icon="log-out" moklyInstance="sign-out">
        Sign out
      </actionButton.Component>
    </section>
  )
}

/** The shared GitHub App, and the accounts where it is installed. */
export function GitHubSection(props: { connected: boolean }) {
  if (!props.connected) {
    return (
      <section.Component
        actions={
          <actionButton.Component
            icon="arrow-up-right"
            moklyInstance="install-github-app"
            tone="primary"
          >
            Install the GitHub App
          </actionButton.Component>
        }
        description="Install the GitHub App on the accounts whose repositories your orgs use."
        moklyInstance="github"
        title="GitHub"
      />
    )
  }
  return (
    <section.Component
      actions={
        <actionButton.Component
          icon="arrow-up-right"
          moklyInstance="manage-on-github"
        >
          Manage on GitHub
        </actionButton.Component>
      }
      description="Each org chooses its repositories from these accounts."
      moklyInstance="github"
      status={<Connected name="github-connected" />}
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
    </section.Component>
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
  /** Where the main button leads: Connect, or the button that gets a code. */
  connectTo: string
  /** The form can close, because it did not open as the next step. */
  cancel: boolean
  /**
   * The form shows the own endpoint kind, and what its address field holds.
   * Without it, the form shows the first kind of the agent.
   */
  endpoint?: EndpointEntry
  /** The step of the ChatGPT sign-in, when the switch selects it. */
  signIn?: SignInStep
}

/**
 * Claude and Codex, each with Connect, or Connected and the kind of its
 * login. An own endpoint login shows its kind with the host of its endpoint
 * under its row, so that a phone shows both in full. Under them come the
 * lines of its model list, with one Refresh, as `EndpointDetails` draws
 * them. `form` opens the Connect form of an agent under its row.
 * `removable` gives each connected login its Remove, and `shares` its share
 * setting, as on the account.
 * `unusable` names a connected login
 * that the app can no longer use: its row says Signed out, with the cause
 * and Sign in again. Sign in again opens the form in the place of the
 * cause, and the login keeps its row, Remove, and its share setting, as in
 * the app.
 */
export function AgentList(props: {
  logins: AgentLogins
  form?: OpenAgentForm
  removable?: boolean
  shares?: LoginShares
  unusable?: UnusableLogin
}) {
  const ids = useId()
  return (
    <ul aria-label="Agents" className={classes(styles.list, styles.agentList)}>
      {agentKeys.map((key) => {
        const login = props.logins[key]
        const unusable =
          login && props.unusable?.agent === key ? props.unusable : undefined
        // The form opens in place of Connect, or under a login that the app
        // can no longer use, as Sign in again opens it.
        const form =
          props.form?.agent === key && (!login || unusable)
            ? props.form
            : undefined
        const nameId = `${ids}-${key}`
        let action = form ? null : (
          <actionButton.Component moklyInstance={`connect-${key}`}>
            Connect
          </actionButton.Component>
        )
        if (login) {
          action = props.removable ? (
            <actionButton.Component
              accessibilityLabel={`Remove ${agents[key].name}`}
              moklyInstance={`remove-${key}`}
              tone="plain"
            >
              Remove
            </actionButton.Component>
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
                    {unusable ? (
                      <signedOutStatus.Component
                        moklyInstance={`signed-out-${key}`}
                      />
                    ) : (
                      <Connected name={`${key}-connected`} />
                    )}
                    {login.kind === 'endpoint' ? null : (
                      <span className={styles.kind}>
                        {loginLabels[key][login.kind]}
                      </span>
                    )}
                  </>
                ) : null}
              </span>
              {action}
            </div>
            {login?.kind === 'endpoint' ? (
              <endpointDetails.Component
                agent={key}
                login={login}
                moklyInstance={`endpoint-${key}`}
              />
            ) : null}
            {unusable && !form ? (
              <loginNotUsable.Component
                cause={unusable.cause}
                moklyInstance={`not-usable-${key}`}
                signInTo={unusable.signInTo}
              />
            ) : null}
            {form ? (
              <agentConnectForm.Component
                agent={key}
                cancel={form.cancel}
                connectTo={form.connectTo}
                moklyInstance={`connect-form-${key}`}
                {...defined({
                  kind: form.kind,
                  signIn: form.signIn,
                  endpoint: form.endpoint,
                })}
              />
            ) : null}
            {login && props.shares ? (
              <loginShare.Component
                moklyInstance={`share-${key}`}
                nameId={nameId}
                shared={sharedByDefault[key][login.kind]}
                {...defined({
                  error:
                    props.shares.notSaved === key
                      ? shareNotSavedCause
                      : undefined,
                })}
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
 * with its kind, the host of an own endpoint, Remove, and its share setting,
 * or Connect, which opens the form of the agent.
 * `unusable` names a login that the app can no longer
 * use.
 */
export function AgentsSection(props: {
  logins: AgentLogins
  form?: OpenAgentForm
  shares: LoginShares
  unusable?: UnusableLogin
}) {
  return (
    <section.Component
      description="Every org uses these agents."
      moklyInstance="agents"
      title="Agents"
    >
      <AgentList
        form={props.form}
        logins={props.logins}
        removable
        shares={props.shares}
        unusable={props.unusable}
      />
    </section.Component>
  )
}
