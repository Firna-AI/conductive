import { Power, Trash2 } from 'lucide-react'
import {
  hasPullRequestTrigger,
  hasSchedule,
} from '../../ui/components/automations/triggerCopy'
import { loginOwnerName } from '../../app/login-owner'
import { personName } from '../../app/people'
import { turnOffAutomation } from '../../app/automation-actions'
import { draftOf } from '../../app/automation-draft'
import type { AutomationTab } from '../../app/router'
import { useStore } from '../../app/store'
import type { User } from '../../shared/api'
import type { Repository } from '../../shared/org-settings'
import type { OrgSummary } from '../../shared/orgs'
import type { Automation } from '../../shared/automations'
import type { SessionLogin } from '../../shared/generated/SessionLogin'
import type { Section } from '../../shared/sections'
import { useApp, useOrgModel } from '../context'
import { ActionButton } from '../ui/actions'
import { useAction } from '../ui/useAction'
import { useDeleteAutomation } from './DeleteAutomation'
import { PromptFacts, type RunLogins } from './PromptBox'
import { AutomationFacts } from './AutomationFields'
import { AutomationFrame } from './AutomationFrame'
import { AutomationNote, type AutomationAccess } from './AutomationNote'
import { RunsPanel, type RunsSource } from './RunsPanel'
import { useChosenSecretNames, type NamedSecret } from './RunSecrets'
import { TriggerFacts } from './TriggerList'

/**
 * Whose logins the runs of `automation` use, as a reader reads them: the
 * login of the runs, which the server names, and the GitHub access of the
 * owner. A run takes the default login of the owner (org login decision
 * 5 A), such as "Acme's" for the org login. When no login serves the
 * owner, or an older reply names none, the line names the owner.
 */
function readerLogins(
  org: OrgSummary,
  automation: Automation,
  runLogin: SessionLogin | null,
): RunLogins {
  const github = `${personName(automation.owner)}'s`
  const owner = runLogin
    ? loginOwnerName(runLogin, org.name, [automation.owner])
    : null
  return { login: owner === null ? github : `${owner}'s`, github }
}

/**
 * An automation as a person who cannot change it reads it: its facts, its
 * triggers, and its prompt with the model and the chosen secrets, beside
 * its runs. While the saved triggers have a pull request trigger, a hint
 * follows the chosen secrets. An admin can turn it off while it is on, and
 * delete it. In a suspended org nobody acts, and no line names the logins
 * of runs and no hint shows, because no run starts. `user` is the person
 * signed in, who reads the causes of their own failed runs as their owner.
 * `runLogin` is the login of the runs that the server names, or null when
 * no login serves the owner. `chosenSecrets` names the chosen secrets, as
 * the same answer gives them, or is null when that answer names none.
 */
export function AutomationReader(props: {
  access: Exclude<AutomationAccess, 'owner'>
  org: OrgSummary
  user: User
  automation: Automation
  runLogin: SessionLogin | null
  chosenSecrets: readonly NamedSecret[] | null
  repositories: readonly Repository[]
  sections: readonly Section[]
  runs: RunsSource
  tab: AutomationTab
}) {
  const { access, org, automation } = props
  const models = useStore(useApp().models)
  const orgModel = useOrgModel(org.id)
  const triggers = draftOf(automation).triggers
  const secretNames = useChosenSecretNames(
    org.id,
    automation.capabilities.preapprovedSecretIds,
    automation,
    props.chosenSecrets,
  )
  const repositoryName =
    props.repositories.find((item) => item.id === automation.repositoryId)
      ?.fullName ?? automation.repositoryId
  const sectionName =
    props.sections.find((item) => item.id === automation.sectionId)?.name ??
    automation.sectionId
  const turnOff = useAction(
    () => turnOffAutomation(orgModel, automation.id),
    'The automation was not turned off',
  )
  const deletion = useDeleteAutomation(org, automation)
  const actions =
    access === 'admin' ? (
      <>
        {automation.active ? (
          <ActionButton
            busy={turnOff.pending}
            icon={Power}
            onPress={() => turnOff.run()}
          >
            Turn off
          </ActionButton>
        ) : null}
        <ActionButton icon={Trash2} onPress={deletion.ask} tone="danger">
          Delete
        </ActionButton>
      </>
    ) : undefined
  return (
    <AutomationFrame
      actions={actions}
      org={org}
      runs={
        <RunsPanel
          orgName={org.name}
          source={props.runs}
          viewer={access === 'suspended' ? null : props.user.id}
        />
      }
      tabs={{ automationId: automation.id, current: props.tab }}
      title={automation.name}
    >
      <AutomationNote
        access={access}
        org={org}
        repositories={props.repositories}
        automation={automation}
      />
      <AutomationFacts
        active={automation.active}
        owner={automation.owner}
        repositoryName={repositoryName}
        sectionName={sectionName}
        timeZone={hasSchedule(triggers) ? automation.timeZone : null}
      />
      <TriggerFacts orgName={org.name} triggers={triggers} />
      <PromptFacts
        choice={automation.choice}
        logins={
          access === 'suspended'
            ? null
            : readerLogins(org, automation, props.runLogin)
        }
        models={models}
        prompt={automation.prompt}
        pullRequest={access !== 'suspended' && hasPullRequestTrigger(triggers)}
        secrets={secretNames}
      />
      {deletion.question}
    </AutomationFrame>
  )
}
