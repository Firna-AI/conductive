import { useId, useState, type ReactNode } from 'react'
import type { Agent } from '../../shared/generated/Agent'
import { classes } from '../../ui/components/common/classes'
import { StatusText } from '../../ui/components/common/StatusText'
import { loginLabels } from '../../ui/components/settings/agentConnectCopy'
import listStyles from '../../ui/components/settings/AccountSections.module.css'
import styles from '../../ui/components/settings/OrgAgents.module.css'
import { orgAgentsCopy as copy } from '../../ui/components/settings/orgAgentsCopy'
import { AGENTS } from '../../app/api/read-core'
import type { OrgAgentLogins } from '../../app/org-agent-logins'
import type { OrgAgentLoginStatus } from '../../shared/org-agent-logins'
import {
  AgentConnectForm,
  type OrgLoginOwner,
} from '../account/AgentConnectForm'
import {
  EndpointDetails,
  type OrgEndpointOwner,
} from '../account/EndpointDetails'
import { agentNames } from '../account/labels'
import { ActionButton } from '../ui/actions'
import { useAction } from '../ui/useAction'
import { EveryMemberSetting } from './EveryMemberSetting'

type OrgLogin = Extract<OrgAgentLoginStatus, { connected: true }>

function connectedLogin(
  logins: readonly OrgAgentLoginStatus[],
  agent: Agent,
): OrgLogin | null {
  const login = logins.find((item) => item.agent === agent)
  return login?.connected ? login : null
}

/**
 * The actions at the end of the row of an admin: Connect without a login,
 * or Replace and Remove, which stay together, also on a phone. An open
 * form takes the place of Connect or Replace.
 */
function RowActions(props: {
  agent: Agent
  login: OrgLogin | null
  formOpen: boolean
  open: () => void
  model: OrgAgentLogins
}) {
  const name = agentNames[props.agent]
  const remove = useAction(
    () => props.model.remove(props.agent),
    `${name} wasn't removed.`,
  )
  if (!props.login) {
    return props.formOpen ? null : (
      <ActionButton accessibilityLabel={`Connect ${name}`} onPress={props.open}>
        Connect
      </ActionButton>
    )
  }
  return (
    <span className={styles.actions}>
      {props.formOpen ? null : (
        <ActionButton
          accessibilityLabel={`Replace the ${name} login`}
          onPress={props.open}
          tone="plain"
        >
          Replace
        </ActionButton>
      )}
      <ActionButton
        accessibilityLabel={`Remove ${name}`}
        busy={remove.pending}
        onPress={remove.run}
        tone="plain"
      >
        Remove
      </ActionButton>
    </span>
  )
}

/**
 * The row of an agent: its name, then Connected with the kind of an API
 * key, and the actions of an admin. A person who cannot change the logins
 * reads Not connected for an agent without an org login.
 */
function OrgLoginRow(props: {
  agent: Agent
  nameId: string
  login: OrgLogin | null
  editable: boolean
  actions: ReactNode
}) {
  const { login } = props
  let detail: ReactNode = null
  if (login) {
    detail = (
      <>
        <StatusText label="Connected" tone="success" />
        {login.kind === 'endpoint' ? null : (
          <span className={listStyles.kind}>
            {loginLabels[props.agent][login.kind]}
          </span>
        )}
      </>
    )
  } else if (!props.editable) {
    detail = <span>{copy.notConnected}</span>
  }
  return (
    <div className={classes(listStyles.row, listStyles.agentRow)}>
      <span className={listStyles.name} id={props.nameId}>
        {agentNames[props.agent]}
      </span>
      <span className={listStyles.detail}>{detail}</span>
      {props.editable ? props.actions : null}
    </div>
  )
}

/**
 * Claude and Codex, each with its org login, as the mockup part
 * `OrgAgentsTab` draws them: Connect, or Connected with the kind of the
 * login, Replace, and Remove. Under the row of an own endpoint,
 * `EndpointDetails` of the account draws the host, and for an admin the
 * note and the warning of the reads of its model list, and the models that
 * the last list lacks, with Refresh. Connect and Replace open the form of
 * the account under the row, one form at a time, with only API key and Own
 * endpoint. Replace opens it on the kind of the login, which serves until
 * the new one saves. Under each login comes the switch "Use for every
 * member". Without `editable`, the list has no actions, form, switch,
 * model list, note, or warning, and the value of each switch shows as its
 * hint. No screen shows the key or the full address.
 */
export function OrgLoginList(props: {
  org: string
  logins: readonly OrgAgentLoginStatus[]
  model: OrgAgentLogins
  editable: boolean
}) {
  const { model, editable } = props
  const [open, setOpen] = useState<Agent | null>(null)
  const ids = useId()
  const close = () => setOpen(null)
  const owner: OrgLoginOwner = {
    name: props.org,
    save: (request) => model.save(request),
  }
  const endpointOwner: OrgEndpointOwner = {
    reads: model.endpointReads,
    refresh: (agent) => model.refreshModels(agent),
  }
  return (
    <ul
      aria-label="Agents"
      className={classes(listStyles.list, listStyles.agentList)}
    >
      {AGENTS.map((agent) => {
        const login = connectedLogin(props.logins, agent)
        const nameId = `${ids}-${agent}`
        const formOpen = editable && open === agent
        return (
          <li key={agent}>
            <OrgLoginRow
              actions={
                <RowActions
                  agent={agent}
                  formOpen={formOpen}
                  login={login}
                  model={model}
                  open={() => setOpen(agent)}
                />
              }
              agent={agent}
              editable={editable}
              login={login}
              nameId={nameId}
            />
            {login?.kind === 'endpoint' ? (
              <EndpointDetails
                login={login}
                org={endpointOwner}
                readOnly={!editable}
              />
            ) : null}
            {formOpen ? (
              <AgentConnectForm
                agent={agent}
                close={close}
                connected={close}
                kind={login?.kind}
                org={owner}
                replace={login !== null}
              />
            ) : null}
            {login ? (
              <EveryMemberSetting
                agent={agent}
                editable={editable}
                model={model}
                nameId={nameId}
                on={login.useForEveryMember}
              />
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
