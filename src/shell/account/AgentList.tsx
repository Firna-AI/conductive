import { useEffect, useId, type ReactNode } from 'react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import { StatusText } from '../../../docs/mockups/src/components/common/StatusText'
import styles from '../../../docs/mockups/src/components/settings/AccountSections.module.css'
import { AGENTS } from '../../app/api/read-core'
import { useStore } from '../../app/store'
import type { AccountResponse, AgentLoginStatus } from '../../shared/account'
import type { Agent } from '../../shared/agents'
import { useApp } from '../context'
import { ActionButton } from '../ui/actions'
import { useInlineForms, type FocusRef } from '../ui/inline-form'
import ui from '../ui/ui.module.css'
import { useAction } from '../ui/useAction'
import { AgentConnectForm } from './AgentConnectForm'
import { agentNames, loginLabels } from './labels'
import {
  LoginNotUsable,
  SignedOutStatus,
  unusableCause,
} from './LoginNotUsable'
import { LoginShareSetting } from './LoginShareSetting'

type ConnectedLogin = Extract<AgentLoginStatus, { connected: true }>

function connectedLogin(
  account: AccountResponse | null,
  agent: Agent,
): ConnectedLogin | null {
  const login = account?.agentLogins.find((item) => item.agent === agent)
  return login?.connected ? login : null
}

function AgentRow(props: {
  agent: Agent
  /** The id of the name of the agent, which names its share setting too. */
  nameId: string
  login: ConnectedLogin | null
  /** Why the app can no longer use the login, or `null` while it can. */
  cause: string | null
  formOpen: boolean
  removable: boolean
  disabled: boolean
  open: () => void
  /** The ref of Connect, which the form gives the focus back to. */
  buttonRef: FocusRef
  /** The ref of the name, which takes the focus when Connect is gone. */
  nameRef: FocusRef
}) {
  const app = useApp()
  const name = agentNames[props.agent]
  const remove = useAction(
    () => app.account.removeLogin(props.agent),
    `${name} wasn't removed.`,
  )
  const { login, nameRef } = props
  let action: ReactNode = null
  if (login && props.removable) {
    action = (
      <ActionButton
        accessibilityLabel={`Remove ${name}`}
        busy={remove.pending}
        onPress={remove.run}
        tone="plain"
      >
        Remove
      </ActionButton>
    )
  } else if (!login && !props.formOpen) {
    action = (
      <ActionButton
        accessibilityLabel={`Connect ${name}`}
        buttonRef={props.buttonRef}
        disabled={props.disabled}
        onPress={props.open}
      >
        Connect
      </ActionButton>
    )
  }
  return (
    <div className={classes(styles.row, styles.agentRow)}>
      <span
        className={classes(styles.name, ui.focusTarget)}
        id={props.nameId}
        ref={nameRef}
        tabIndex={-1}
      >
        {name}
      </span>
      <span className={styles.detail}>
        {login ? (
          <>
            {props.cause === null ? (
              <StatusText label="Connected" tone="success" />
            ) : (
              <SignedOutStatus />
            )}
            <span className={styles.kind}>
              {loginLabels[login.agent][login.kind]}
            </span>
          </>
        ) : null}
      </span>
      {action}
    </div>
  )
}

/**
 * Claude and Codex, each with Connect, or Connected and the kind of its
 * login. In a narrow list, as on a phone, Connected and the kind go on a
 * second line under the name, so that the kind shows in full. Connect opens
 * the form of the agent under its row, one form at a time. `initial` opens
 * a form at first, and again each time that it changes, as when the agent
 * step of Get started becomes the next step. A change to null closes the
 * open form. `removable` gives each connected login its Remove, and
 * `shares` its share setting, as on the account. `closable` gives each form
 * its Cancel. `disabled` turns Connect off, as in a later step of Get
 * started.
 *
 * A login that the app can no longer use says Signed out in place of
 * Connected, with its cause and Sign in again under its row. Sign in again,
 * and `initial`, open the form of its agent with the kind of the login, in
 * the place of the cause. Each open of the list reads the logins again, so
 * that a login that stopped after the app opened shows Signed out.
 *
 * Each form is an inline form of `useInlineForms`: Connect and Sign in again
 * give it the focus, and it gives the focus back to the button that opens
 * it. After a connect, that button is gone, so the name of the agent takes
 * the focus.
 */
export function AgentList(props: {
  initial: Agent | null
  removable: boolean
  shares?: boolean
  closable: boolean
  disabled?: boolean
  /** Runs after a save, such as the refresh of Get started. */
  connected?: () => void
}) {
  const app = useApp()
  const account = useStore(app.account.account)
  useEffect(() => {
    void app.account.refreshLogins()
  }, [app])
  const forms = useInlineForms<Agent>(props.initial)
  const ids = useId()
  const disabled = props.disabled ?? false
  return (
    <ul aria-label="Agents" className={classes(styles.list, styles.agentList)}>
      {AGENTS.map((agent) => {
        const login = connectedLogin(account, agent)
        const cause = unusableCause(login)
        const formOpen =
          forms.open === agent && (login === null || cause !== null)
        const nameId = `${ids}-${agent}`
        const open = () => forms.show(agent)
        return (
          <li key={agent}>
            <AgentRow
              agent={agent}
              buttonRef={forms.button(agent)}
              cause={cause}
              disabled={disabled}
              formOpen={formOpen}
              login={login}
              nameId={nameId}
              nameRef={forms.fallback(agent)}
              open={open}
              removable={props.removable}
            />
            {cause !== null && !formOpen ? (
              <LoginNotUsable
                buttonRef={forms.button(agent)}
                cause={cause}
                disabled={disabled}
                signInAgain={open}
              />
            ) : null}
            {formOpen ? (
              <AgentConnectForm
                agent={agent}
                close={props.closable ? forms.close : undefined}
                connected={() => {
                  forms.close()
                  props.connected?.()
                }}
                focus={forms.focus(agent)}
                kind={login?.kind}
              />
            ) : null}
            {login && props.shares ? (
              <LoginShareSetting
                agent={agent}
                nameId={nameId}
                noReuse={login.noReuse}
              />
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
