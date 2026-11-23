import { useId } from 'react'
import { agentKeys, agents, type AgentKey } from '../../fixtures/agents'
import {
  shareNotSavedCause,
  type AgentLogin,
  type AgentLogins,
} from '../../fixtures/logins'
import { plainData } from '../../defined'
import { endpointDetails } from '../../entries/components/settings/EndpointDetails.mockup'
import { noop } from '../../../../../src/ui/noop'
import { ActionButton } from '../../../../../src/ui/components/common/actions'
import { classes } from '../../../../../src/ui/components/common/classes'
import { ScreenLink } from '../common/ScreenLink'
import { loginLabels } from '../../../../../src/ui/components/settings/agentConnectCopy'
import { AgentConnectForm } from './AgentConnectForm'
import { connected, type OpenAgentForm } from './AgentList'
import type { ReadOnlyCause } from '../../../../../src/ui/components/settings/readOnlyCause'
import { orgAgentsCopy } from '../../../../../src/ui/components/settings/orgAgentsCopy'
import { Section } from '../../../../../src/ui/components/settings/Section'
import { SettingSwitch } from '../../../../../src/ui/components/settings/SettingSwitch'
import listStyles from '../../../../../src/ui/components/settings/AccountSections.module.css'
import lineStyles from '../../../../../src/ui/components/settings/OrgLoginLines.module.css'
import styles from '../../../../../src/ui/components/settings/OrgAgents.module.css'

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
 * or the org login with its kind, Replace, and Remove. Under the row of an
 * own endpoint, `EndpointDetails` of the account draws the host, the note
 * after a Codex save that added `/v1`, the warning after a model list read
 * that failed, and the models that the last list lacks, with one Refresh,
 * from a design call of 17 November 2026. The form offers only an API key
 * and an own endpoint, and it has no share switch. Replace opens the form
 * under the login, which serves until the new one saves. Under each org
 * login, the switch "Use for every member" of decision 7 B makes each new
 * session in the org take the org login, also for a member with a login of
 * their own. It starts off. No screen shows the key or the full address.
 *
 * `readOnly` shows the tab without actions, switches, the model list, the
 * note, and the warning: to a member who is not an admin, from decision
 * 57, with the value of each switch in words, and to everyone in a
 * suspended org.
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
                <endpointDetails.Component
                  agent={key}
                  login={plainData(login)}
                  moklyInstance={`endpoint-${key}`}
                  owner="org"
                  readOnly={readOnly}
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
