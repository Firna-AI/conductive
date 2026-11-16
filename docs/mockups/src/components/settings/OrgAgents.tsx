import { useId } from 'react'
import { agentKeys, agents, type AgentKey } from '../../fixtures/agents'
import {
  loginLabels,
  shareNotSavedCause,
  type AgentLogin,
  type AgentLogins,
} from '../../fixtures/logins'
import { noop } from '../../noop'
import { ActionButton } from '../common/actions'
import { classes } from '../common/classes'
import { ScreenLink } from '../common/ScreenLink'
import { AgentConnectForm } from './AgentConnectForm'
import { connected, type OpenAgentForm } from './AgentList'
import { EndpointModels } from './EndpointModels'
import { LoginEndpoint } from './LoginEndpoint'
import type { ReadOnlyCause } from './OrgSections'
import { Section } from './Section'
import { SettingSwitch } from './SettingSwitch'
import listStyles from './AccountSections.module.css'
import lineStyles from './OrgLoginLines.module.css'
import styles from './OrgAgents.module.css'

/** The words of the Agents tab of the org settings. The app takes them here. */
export const orgAgentsCopy = {
  description: (org: string) =>
    `Members of ${org} use these logins when they have none of their own.`,
  /** The sentence after the description, for a member who is not an admin. */
  memberNote: ' Only an admin can change them.',
  notConnected: 'Not connected',
  everyMember: {
    label: 'Use for every member',
    on: 'Every new session uses it, also for members with a login of their own.',
    off: 'Members without a login of their own use it.',
  },
} as const

/**
 * The switch "Use for every member" of each org login: the agents whose
 * switch is on, and the agent whose last change the app did not save.
 */
export type EveryMember = {
  on: readonly AgentKey[]
  notSaved: AgentKey | null
}

/** Where Connect and Replace lead in the catalogue. */
type RowLinks = { connectTo: string; replaceTo: string }

/**
 * The actions at the end of the row of an admin: Connect without a login,
 * or Replace and Remove. They stay together, also on a phone. An open form
 * takes the place of its button.
 */
function RowActions(props: {
  agent: AgentKey
  login?: AgentLogin
  form?: OpenAgentForm
  links: RowLinks
}) {
  const name = agents[props.agent].name
  if (!props.login) {
    return props.form ? null : (
      <ScreenLink asChild to={props.links.connectTo}>
        <ActionButton>Connect</ActionButton>
      </ScreenLink>
    )
  }
  return (
    <span className={styles.actions}>
      {props.form?.replace ? null : (
        <ScreenLink asChild to={props.links.replaceTo}>
          <ActionButton
            accessibilityLabel={`Replace the ${name} login`}
            tone="plain"
          >
            Replace
          </ActionButton>
        </ScreenLink>
      )}
      <ActionButton accessibilityLabel={`Remove ${name}`} tone="plain">
        Remove
      </ActionButton>
    </span>
  )
}

/**
 * The switch "Use for every member" under an org login, with the hint of
 * its value and the cause of a change that the app did not save. A person
 * who may not change it reads the hint of its value as a line.
 */
function EveryMemberSetting(props: {
  nameId: string
  on: boolean
  notSaved: boolean
  readOnly: boolean
}) {
  const copy = orgAgentsCopy.everyMember
  const hint = props.on ? copy.on : copy.off
  if (props.readOnly) return <p className={lineStyles.line}>{hint}</p>
  return (
    <SettingSwitch
      error={props.notSaved ? shareNotSavedCause : null}
      hint={hint}
      label={copy.label}
      nameId={props.nameId}
      onChange={noop}
      value={props.on}
    />
  )
}

/**
 * The Agents tab of the org settings, from decision 1 B of the org logins
 * plan, which the user chose on 16 November 2026: a copy of the Agents tab
 * of the account with fewer options. Claude and Codex each show Connect,
 * or the org login with its kind, the host of an own endpoint, the models
 * that the model list of the endpoint lacks, Replace, and Remove. The form
 * offers only an API key and an own endpoint, and it has no share switch.
 * Replace opens the form under the login, which serves until the new one
 * saves. Under each org login, the switch "Use for every member" of
 * decision 7 B makes each new session in the org take the org login, also
 * for a member with a login of their own. It starts off. No screen shows
 * the key or the full address.
 *
 * `readOnly` shows the tab without actions, switches, and model list: to a
 * member who is not an admin, from decision 57, with the value of each
 * switch in words, and to everyone in a suspended org.
 */
export function OrgAgentsTab(props: {
  org: string
  logins: AgentLogins
  form?: OpenAgentForm
  everyMember: EveryMember
  readOnly?: ReadOnlyCause
  links: RowLinks
}) {
  const ids = useId()
  const readOnly = props.readOnly !== undefined
  const note = props.readOnly === 'member' ? orgAgentsCopy.memberNote : ''
  return (
    <Section
      description={`${orgAgentsCopy.description(props.org)}${note}`}
      title="Agents"
    >
      <ul
        aria-label="Agents"
        className={classes(listStyles.list, listStyles.agentList)}
      >
        {agentKeys.map((key) => {
          const login = props.logins[key]
          const form = props.form?.agent === key ? props.form : undefined
          const nameId = `${ids}-${key}`
          let detail = null
          if (login) {
            detail = (
              <>
                {connected}
                {login.kind === 'endpoint' ? null : (
                  <span className={listStyles.kind}>
                    {loginLabels[key][login.kind]}
                  </span>
                )}
              </>
            )
          } else if (readOnly) {
            detail = <span>{orgAgentsCopy.notConnected}</span>
          }
          return (
            <li key={key}>
              <div className={classes(listStyles.row, listStyles.agentRow)}>
                <span className={listStyles.name} id={nameId}>
                  {agents[key].name}
                </span>
                <span className={listStyles.detail}>{detail}</span>
                {readOnly ? null : (
                  <RowActions
                    agent={key}
                    form={form}
                    links={props.links}
                    login={login}
                  />
                )}
              </div>
              {login?.kind === 'endpoint' ? (
                <LoginEndpoint
                  host={login.host}
                  kind={loginLabels[key].endpoint}
                />
              ) : null}
              {!readOnly && login?.kind === 'endpoint' && login.models ? (
                <EndpointModels
                  agent={agents[key].name}
                  check={login.models}
                  owner="org"
                />
              ) : null}
              {form && !readOnly ? (
                <AgentConnectForm
                  agent={key}
                  cancel={form.cancel}
                  connectTo={form.connectTo}
                  endpoint={form.endpoint}
                  failed={form.failed}
                  kind={form.kind}
                  org={props.org}
                  replace={form.replace}
                />
              ) : null}
              {login ? (
                <EveryMemberSetting
                  nameId={nameId}
                  notSaved={props.everyMember.notSaved === key}
                  on={props.everyMember.on.includes(key)}
                  readOnly={readOnly}
                />
              ) : null}
            </li>
          )
        })}
      </ul>
    </Section>
  )
}
