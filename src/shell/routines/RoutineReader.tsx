import { Power, Trash2 } from 'lucide-react'
import { hasSchedule } from '../../../docs/mockups/src/components/routines/triggerCopy'
import { personName } from '../../app/people'
import { turnOffRoutine } from '../../app/routine-actions'
import { draftOf } from '../../app/routine-draft'
import type { RoutineTab } from '../../app/router'
import { useStore } from '../../app/store'
import type { User } from '../../shared/api'
import type { Repository } from '../../shared/org-settings'
import type { OrgSummary } from '../../shared/orgs'
import type { Routine } from '../../shared/routines'
import type { Section } from '../../shared/sections'
import { useApp, useOrgModel } from '../context'
import { ActionButton } from '../ui/actions'
import { useAction } from '../ui/useAction'
import { useDeleteRoutine } from './DeleteRoutine'
import { PromptFacts } from './PromptBox'
import { RoutineFacts } from './RoutineFields'
import { RoutineFrame } from './RoutineFrame'
import { RoutineNote, type RoutineAccess } from './RoutineNote'
import { RunsPanel, type RunsSource } from './RunsPanel'
import { TriggerFacts } from './TriggerList'

/**
 * A routine as a person who cannot change it reads it: its facts, its
 * triggers, and its prompt with the model, beside its runs. An admin can
 * turn it off while it is on, and delete it. In a suspended org nobody
 * acts, and no line names the logins of runs, because no run starts.
 * `user` is the person signed in, who reads the causes of their own failed
 * runs as their owner.
 */
export function RoutineReader(props: {
  access: Exclude<RoutineAccess, 'owner'>
  org: OrgSummary
  user: User
  routine: Routine
  repositories: readonly Repository[]
  sections: readonly Section[]
  runs: RunsSource
  tab: RoutineTab
}) {
  const { access, org, routine } = props
  const models = useStore(useApp().models)
  const orgModel = useOrgModel(org.id)
  const triggers = draftOf(routine).triggers
  const repositoryName =
    props.repositories.find((item) => item.id === routine.repositoryId)
      ?.fullName ?? routine.repositoryId
  const sectionName =
    props.sections.find((item) => item.id === routine.sectionId)?.name ??
    routine.sectionId
  const turnOff = useAction(
    () => turnOffRoutine(orgModel, routine.id),
    'The routine was not turned off',
  )
  const deletion = useDeleteRoutine(org, routine)
  const actions =
    access === 'admin' ? (
      <>
        {routine.active ? (
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
    <RoutineFrame
      actions={actions}
      org={org}
      runs={
        <RunsPanel
          orgName={org.name}
          source={props.runs}
          viewer={access === 'suspended' ? null : props.user.id}
        />
      }
      tabs={{ routineId: routine.id, current: props.tab }}
      title={routine.name}
    >
      <RoutineNote
        access={access}
        org={org}
        repositories={props.repositories}
        routine={routine}
      />
      <RoutineFacts
        active={routine.active}
        owner={routine.owner}
        repositoryName={repositoryName}
        sectionName={sectionName}
        timeZone={hasSchedule(triggers) ? routine.timeZone : null}
      />
      <TriggerFacts orgName={org.name} triggers={triggers} />
      <PromptFacts
        choice={routine.choice}
        models={models}
        prompt={routine.prompt}
        whose={access === 'suspended' ? null : `${personName(routine.owner)}'s`}
      />
      {deletion.question}
    </RoutineFrame>
  )
}
