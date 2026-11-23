import { useState } from 'react'
import { SegmentedControl } from '@firna/ui/segmented'
import { TriangleAlert } from 'lucide-react'
import type { Agent } from '../../shared/generated/Agent'
import { Notice } from '../../ui/components/common/Notice'
import { useControlSizes } from '../../ui/components/common/touch'
import {
  agentConnectCopy,
  connectKinds,
  loginLabels,
  orgConnectKinds,
} from '../../ui/components/settings/agentConnectCopy'
import styles from '../../ui/components/settings/AgentConnectForm.module.css'
import { SecretForm } from '../../app/secret-form'
import { useStore } from '../../app/store'
import type { SaveAgentLoginRequest } from '../../shared/account'
import type { SaveOrgAgentLoginRequest } from '../../shared/org-agent-logins'
import { useApp } from '../context'
import { ActionButton } from '../ui/actions'
import { addressProblem, EndpointFields } from './EndpointFields'
import { ChatGptSignIn } from './ChatGptSignIn'
import { agentNames, type LoginKind } from './labels'
import { refusesAddress, SecretField, SecretText } from './SecretFields'

function loginRequest(
  agent: Agent,
  kind: LoginKind,
  secret: string,
  endpoint: string,
): SaveAgentLoginRequest {
  if (kind === 'endpoint') return { agent, kind, endpoint, secret }
  if (agent === 'claude') return { agent, kind, secret }
  return { agent, kind: 'api-key', secret }
}

/** The save of an org login, which is an API key or an own endpoint. */
function orgLoginRequest(
  agent: Agent,
  kind: LoginKind,
  secret: string,
  endpoint: string,
): SaveOrgAgentLoginRequest {
  if (kind === 'endpoint') return { agent, kind, endpoint, secret }
  return { agent, kind: 'api-key', secret }
}

/**
 * The org whose login the form saves, on the Agents tab of the org
 * settings, in place of a login of the account.
 */
export interface OrgLoginOwner {
  /** The name of the org, whose account the words of an API key name. */
  name: string
  save: (request: SaveOrgAgentLoginRequest) => Promise<void>
}

/**
 * The form that connects an agent, open under its row: Claude with a
 * subscription token, an API key, or an own endpoint, and Codex with an
 * OpenAI API key, a ChatGPT plan, or an own endpoint. On a phone the kinds wrap onto a
 * second line. The secret leaves the browser once, in the save. The form
 * checks the address of an own endpoint with the rule of the save, and
 * shows a refusal at the address before any request. A failed save keeps
 * the secret in the field and shows why. Cancel shows when `close` is set.
 *
 * With `org`, the form saves the org login of that org, as the Agents tab
 * of the org settings does: it offers only API key and Own endpoint, and
 * its words ask for a key of the account of the org. `replace` makes it
 * replace a connected login, so its main button says Replace.
 */
export function AgentConnectForm(props: {
  agent: Agent
  kind?: LoginKind
  close?: () => void
  connected: () => void
  org?: OrgLoginOwner
  replace?: boolean
}) {
  const app = useApp()
  const { field } = useControlSizes()
  const [form] = useState(() => new SecretForm())
  const kinds = (props.org ? orgConnectKinds : connectKinds)[props.agent]
  const name = agentNames[props.agent]
  const [kind, setKind] = useState<LoginKind>(props.kind ?? kinds[0])
  const [address, setAddress] = useState('')
  const [refusal, setRefusal] = useState<string | null>(null)
  const state = useStore(form.state)
  const submit = () => {
    if (kind === 'endpoint') {
      const problem = addressProblem(props.agent, address)
      setRefusal(problem)
      if (problem !== null) return
    }
    const { agent, org } = props
    const endpoint = address.trim()
    const save = (secret: string) =>
      org
        ? org.save(orgLoginRequest(agent, kind, secret, endpoint))
        : app.account.saveLogin(loginRequest(agent, kind, secret, endpoint))
    void form.submit(save).then((saved) => {
      const { error } = form.state.get()
      if (saved) props.connected()
      else if (error && refusesAddress(error)) setRefusal(error.message)
    })
  }
  return (
    <div className={styles.form}>
      <SegmentedControl
        accessibilityLabel={agentConnectCopy.switchLabel}
        disabled={state.saving}
        onChange={setKind}
        options={kinds.map((item) => ({
          label: loginLabels[props.agent][item],
          value: item,
        }))}
        size={field}
        value={kind}
        wrap
      />
      {props.agent === 'codex' && kind === 'token' ? (
        <ChatGptSignIn close={props.close} connected={props.connected} />
      ) : (
        <>
          {kind === 'endpoint' ? (
            <EndpointFields
              address={address}
              agent={props.agent}
              changeAddress={(text) => {
                setAddress(text)
                setRefusal(null)
              }}
              form={form}
              refusal={refusal}
              submit={submit}
            />
          ) : (
            <>
              <SecretText
                agent={props.agent}
                kind={kind}
                org={props.org?.name}
              />
              <SecretField
                agent={props.agent}
                form={form}
                kind={kind}
                submit={submit}
              />
            </>
          )}
          {state.error && !refusesAddress(state.error) ? (
            <Notice
              body={state.error.message}
              icon={TriangleAlert}
              title={
                props.replace
                  ? `The ${name} login wasn't replaced`
                  : `${name} wasn't connected`
              }
              tone="danger"
            />
          ) : null}
          <div className={styles.actions}>
            {props.close ? (
              <ActionButton disabled={state.saving} onPress={props.close}>
                Cancel
              </ActionButton>
            ) : null}
            <ActionButton busy={state.saving} onPress={submit} tone="primary">
              {props.replace ? 'Replace' : 'Connect'}
            </ActionButton>
          </div>
        </>
      )}
    </div>
  )
}
