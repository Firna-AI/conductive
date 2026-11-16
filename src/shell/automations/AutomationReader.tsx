import { Power, Trash2 } from 'lucide-react'
import { hasSchedule } from '../../../docs/mockups/src/components/automations/triggerCopy'
import { personName } from '../../app/people'
import { turnOffAutomation } from '../../app/automation-actions'
import { draftOf } from '../../app/automation-draft'
import type { AutomationTab } from '../../app/router'
import { useStore } from '../../app/store'
import type { User } from '../../shared/api'
import type { Repository } from '../../shared/org-settings'
import type { OrgSummary } from '../../shared/orgs'
import type { Automation } from '../../shared/automations'
import type { Section } from '../../shared/sections'
import { useApp, useOrgModel } from '../context'
import { ActionButton } from '../ui/actions'
import { useAction } from '../ui/useAction'
import { useDeleteAutomation } from './DeleteAutomation'
import { PromptFacts } from './PromptBox'
import { AutomationFacts } from './AutomationFields'
import { AutomationFrame } from './AutomationFrame'
import { AutomationNote, type AutomationAccess } from './AutomationNote'
import { RunsPanel, type RunsSource } from './RunsPanel'
import { TriggerFacts } from './TriggerList'

/**
 * An automation as a person who cannot change it reads it: its facts, its
 * triggers, and its prompt with the model, beside its runs. An admin can
 * turn it off while it is on, and delete it. In a suspended org nobody
 * acts, and no line names the logins of runs, because no run starts.
 * `user` is the person signed in, who reads the causes of their own failed
 * runs as their owner.
 */
export function AutomationReader(props: {
  access: Exclude<AutomationAccess, 'owner'>
  org: OrgSummary
  user: User
  automation: Automation
  repositories: readonly Repository[]
  sections: readonly Section[]
  runs: RunsSource
  tab: AutomationTab
}) {
  const { access, org, automation } = props
  const models = useStore(useApp().models)
  const orgModel = useOrgModel(org.id)
  const triggers = draftOf(automation).triggers
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
        models={models}
        prompt={automation.prompt}
        whose={
          access === 'suspended' ? null : `${personName(automation.owner)}'s`
        }
      />
      {deletion.question}
    </AutomationFrame>
  )
}
