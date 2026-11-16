import { useId } from 'react'
import { agentKeys, agents, type AgentKey } from '../../fixtures/agents'
import {
  loginLabels,
  shareNotSavedCause,
  sharedByDefault,
  type AgentLogins,
  type LoginKind,
} from '../../fixtures/logins'
import { noop } from '../../noop'
import { ActionButton } from '../common/actions'
import { classes } from '../common/classes'
import { StatusText } from '../common/StatusText'
import { AgentConnectForm } from './AgentConnectForm'
import type { EndpointEntry } from './EndpointFields'
import { EndpointModels } from './EndpointModels'
import { LoginEndpoint } from './LoginEndpoint'
import type { SignInStep } from './chatGptSignInCopy'
import {
  LoginNotUsable,
  SignedOutStatus,
  type UnusableLogin,
} from './LoginNotUsable'
import { LoginShare } from './LoginShare'
import { OrgLoginLines, type OrgLoginUse } from './OrgLoginLines'
import styles from './AccountSections.module.css'

/** The state of a connected login or of GitHub, in its row. */
export const connected = <StatusText label="Connected" tone="success" />

/**
 * The share setting under each connected login, as on the account. Each
 * login shows the value that a new login of its agent and kind starts with.
 * `notSaved` names the agent whose last change the app did not save.
 */
export type LoginShares = { notSaved: AgentKey | null }

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
  /** The form replaces a connected login, so its main button says Replace. */
  replace?: boolean
  /** The cause of a save that failed, which a notice over the buttons gives. */
  failed?: string
}

/**
 * Claude and Codex, each with Connect, or Connected and the kind of its
 * login. An own endpoint login shows its kind with the host of its endpoint
 * under its row, so that a phone shows both in full. Under them come the
 * models of the app that the model list of the endpoint does not name, with
 * Refresh. `form` opens the Connect form of an agent under its row.
 * `removable` gives each connected login its Remove, and `shares` its share
 * setting, as on the account.
 * `unusable` names a connected login
 * that the app can no longer use: its row says Signed out, with the cause
 * and Sign in again. Sign in again opens the form in the place of the
 * cause, and the login keeps its row, Remove, and its share setting, as in
 * the app. `orgLogins` gives a line under an agent for each org whose org
 * login serves the new sessions of the person signed in.
 */
export function AgentList(props: {
  logins: AgentLogins
  form?: OpenAgentForm
  removable?: boolean
  shares?: LoginShares
  unusable?: UnusableLogin
  orgLogins?: OrgLoginUse
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
                    {unusable ? <SignedOutStatus /> : connected}
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
              <LoginEndpoint
                host={login.host}
                kind={loginLabels[key].endpoint}
              />
            ) : null}
            {login?.kind === 'endpoint' && login.models ? (
              <EndpointModels agent={agents[key].name} check={login.models} />
            ) : null}
            {unusable && !form ? (
              <LoginNotUsable
                cause={unusable.cause}
                signInTo={unusable.signInTo}
              />
            ) : null}
            <OrgLoginLines orgs={props.orgLogins?.[key]} />
            {form ? (
              <AgentConnectForm
                agent={key}
                cancel={form.cancel}
                connectTo={form.connectTo}
                kind={form.kind}
                signIn={form.signIn}
                endpoint={form.endpoint}
              />
            ) : null}
            {login && props.shares ? (
              <LoginShare
                error={
                  props.shares.notSaved === key ? shareNotSavedCause : null
                }
                nameId={nameId}
                onChange={noop}
                shared={sharedByDefault[key][login.kind]}
              />
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
