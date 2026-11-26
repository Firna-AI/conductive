import type { Agent } from '../../shared/generated/Agent'
import lineStyles from '../../ui/components/settings/OrgLoginLines.module.css'
import { orgAgentsCopy } from '../../ui/components/settings/orgAgentsCopy'
import { SettingSwitch } from '../../ui/components/settings/SettingSwitch'
import type { OrgAgentLogins } from '../../app/org-agent-logins'
import { useAction } from '../ui/useAction'

const copy = orgAgentsCopy.everyMember

/**
 * The switch of an admin, which saves at once. While a change saves, the
 * switch shows the new value and takes no other change. A change that the
 * app did not save shows its cause under the hint until the next change,
 * and the switch shows the saved value again.
 */
function EveryMemberSwitch(props: {
  agent: Agent
  nameId: string
  on: boolean
  model: OrgAgentLogins
}) {
  const save = useAction((on: boolean) =>
    props.model.setUseForEveryMember(props.agent, on),
  )
  return (
    <SettingSwitch
      error={save.error?.message ?? null}
      hint={props.on ? copy.on : copy.off}
      label={copy.label}
      nameId={props.nameId}
      onChange={save.run}
      saving={save.pending}
      value={props.on}
    />
  )
}

/**
 * The switch "Use for every member" under an org login, from decision 7 B
 * of the org logins plan: while it is on, each new session in the org
 * takes the org login, also for a member with a login of their own. It
 * starts off. `on` is the value that shows. A person who cannot change it
 * reads the hint of its value as a line, because the value decides which
 * login their new sessions take. `nameId` is the id of the name of the
 * agent in its row, which starts the spoken name of the switch.
 */
export function EveryMemberSetting(props: {
  agent: Agent
  nameId: string
  on: boolean
  editable: boolean
  model: OrgAgentLogins
}) {
  if (!props.editable) {
    return <p className={lineStyles.line}>{props.on ? copy.on : copy.off}</p>
  }
  return (
    <EveryMemberSwitch
      agent={props.agent}
      model={props.model}
      nameId={props.nameId}
      on={props.on}
    />
  )
}
