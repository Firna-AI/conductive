import { useMemo } from 'react'
import { Trash2 } from 'lucide-react'
import { offersRunNow } from '../../../docs/mockups/src/components/routines/triggerCopy'
import styles from '../../../docs/mockups/src/screens/RoutineScreen.module.css'
import {
  draftFields,
  draftOf,
  draftReady,
  sameDraft,
  type RoutineDraft,
} from '../../app/routine-draft'
import type { RoutineTab } from '../../app/router'
import { useStore, valueOf } from '../../app/store'
import type { User } from '../../shared/api'
import type { Repository } from '../../shared/org-settings'
import type { OrgSummary } from '../../shared/orgs'
import type { Routine } from '../../shared/routines'
import type { Section } from '../../shared/sections'
import { useApp, useOrgModel } from '../context'
import { ActionButton } from '../ui/actions'
import { eachField, useSavedDraft } from '../ui/useSavedDraft'
import { useViewport } from '../ui/viewport'
import { useDeleteRoutine } from './DeleteRoutine'
import { PromptEditor } from './PromptBox'
import { RoutineFields } from './RoutineFields'
import { RoutineFrame } from './RoutineFrame'
import { RoutineNote } from './RoutineNote'
import { RunNowButton } from './RunNow'
import { RunsPanel, type RunsSource } from './RunsPanel'
import { TriggerEditor } from './TriggerList'
import { useRoutineSave } from './useRoutineSave'

/**
 * The form follows a newer saved routine field by field, so an edit stays,
 * and a field that changed elsewhere, such as Active after a turn-off,
 * shows its new value.
 */
const followEachField = eachField(draftFields)

/** A saved routine with its runs, or the draft of a new one, which the first save creates. */
type Source =
  | { routine: Routine; initial?: undefined; runs: RunsSource }
  | { routine: null; initial: RoutineDraft; runs: null }

/**
 * The routine page of its owner: the fields, the triggers, and the prompt,
 * with Save, Run now, and Delete, beside the Runs list. Save stays off while
 * nothing changed, while the prompt has no text, and while the form refuses
 * a cron. Run now shows on a saved routine that has a schedule or no
 * trigger. A phone shows Save on the Routine tab only.
 */
export function RoutineEditor(
  props: Source & {
    org: OrgSummary
    user: User
    repositories: readonly Repository[]
    sections: readonly Section[]
    tab: RoutineTab
  },
) {
  const { org, routine } = props
  const models = useStore(useApp().models)
  const orgModel = useOrgModel(org.id)
  const members = valueOf(useStore(orgModel.members))?.members ?? []
  const phone = useViewport() === 'phone'
  const saved = useMemo(
    () => (routine ? draftOf(routine) : props.initial),
    [routine, props.initial],
  )
  const form = useSavedDraft(saved, followEachField)
  const { draft } = form
  const { save, refused, refusal } = useRoutineSave({
    org,
    routine,
    form,
    saved,
  })
  const deletion = useDeleteRoutine(org, routine)
  const change = (next: RoutineDraft) => {
    if (next.triggers !== draft.triggers) save.reset()
    form.change(next)
  }
  const ready = draftReady(draft) && (!routine || !sameDraft(draft, saved))
  const repositoryName =
    props.repositories.find((item) => item.id === draft.repositoryId)
      ?.fullName ?? draft.repositoryId
  const owner = routine?.owner ?? {
    id: props.user.id,
    githubLogin: props.user.githubLogin,
    displayName: props.user.displayName,
    avatarUrl: props.user.avatarUrl,
  }
  const deleteButton =
    routine && !phone ? (
      <ActionButton icon={Trash2} onPress={deletion.ask} tone="danger">
        Delete
      </ActionButton>
    ) : null
  const runNow =
    routine && offersRunNow(saved.triggers) ? (
      <RunNowButton org={org} routine={routine} tab={props.tab} />
    ) : null
  const saveButton =
    phone && props.tab === 'runs' ? null : (
      <ActionButton
        busy={save.pending}
        disabled={!ready}
        keepFocus
        onPress={() => save.run()}
        tone="primary"
      >
        Save
      </ActionButton>
    )
  // A phone draws no footer when the Runs tab has no action.
  const actions =
    deleteButton || runNow || saveButton ? (
      <>
        {deleteButton}
        {runNow}
        {saveButton}
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
          viewer={props.user.id}
        />
      }
      tabs={routine ? { routineId: routine.id, current: props.tab } : undefined}
      title={routine ? routine.name : 'New routine'}
    >
      {routine ? (
        <RoutineNote
          access="owner"
          org={org}
          repositories={props.repositories}
          routine={routine}
        />
      ) : null}
      <RoutineFields
        change={change}
        draft={draft}
        orgName={org.name}
        owner={owner}
        repositories={props.repositories
          .filter((item) => item.selected)
          .map((item) => ({ id: item.id, name: item.fullName }))}
        repositoryName={repositoryName}
        sections={props.sections.map((item) => ({
          id: item.id,
          name: item.name,
        }))}
      />
      <TriggerEditor
        change={(triggers) => change({ ...draft, triggers })}
        changeTimeZone={(timeZone) => change({ ...draft, timeZone })}
        members={members.map((member) => member.user)}
        orgName={org.name}
        refusal={refusal}
        refused={refused}
        timeZone={draft.timeZone}
        triggers={draft.triggers}
      />
      <PromptEditor
        changeChoice={(choice) => change({ ...draft, choice })}
        changePrompt={(prompt) => change({ ...draft, prompt })}
        choice={draft.choice}
        models={models}
        prompt={draft.prompt}
      />
      {routine && phone ? (
        <div className={styles.phoneDelete}>
          <ActionButton icon={Trash2} onPress={deletion.ask} tone="danger">
            Delete routine
          </ActionButton>
        </div>
      ) : null}
      {deletion.question}
    </RoutineFrame>
  )
}
