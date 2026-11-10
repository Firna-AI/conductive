import { useMemo } from 'react'
import { useToast } from '@firna/ui/toast'
import { Trash2 } from 'lucide-react'
import styles from '../../../docs/mockups/src/screens/RoutineScreen.module.css'
import { useNavigation } from '../../app/navigation'
import { createRoutine, updateRoutine } from '../../app/routine-actions'
import {
  createRequest,
  draftOf,
  draftReady,
  sameDraft,
  updateRequest,
  type RoutineDraft,
} from '../../app/routine-draft'
import { routes } from '../../app/router'
import { asApiError, useStore, valueOf } from '../../app/store'
import type { User } from '../../shared/api'
import type { Repository } from '../../shared/org-settings'
import type { OrgSummary } from '../../shared/orgs'
import type { Routine } from '../../shared/routines'
import type { Section } from '../../shared/sections'
import { useApp, useOrgModel } from '../context'
import { ActionButton } from '../ui/actions'
import { useAction } from '../ui/useAction'
import { useSavedDraft } from '../ui/useSavedDraft'
import { useViewport } from '../ui/viewport'
import { useDeleteRoutine } from './DeleteRoutine'
import { PromptEditor } from './PromptBox'
import { RoutineFields } from './RoutineFields'
import { RoutineFrame } from './RoutineFrame'
import { RoutineNote } from './RoutineNote'
import { TriggerEditor } from './TriggerList'

/** The refusal of a save whose author filter names no GitHub account. */
const unknownLogin = 'unknown_github_login'

/** A saved routine, or the draft of a new one, which the first save creates. */
type Source =
  | { routine: Routine; initial?: undefined }
  | { routine: null; initial: RoutineDraft }

/**
 * The routine page of its owner: the fields, the triggers, and the prompt,
 * with Save and Delete. Save stays off while nothing changed, while the
 * prompt has no text, and while the form refuses a cron. The form stays
 * mounted through each save. A refused login shows under the triggers, and
 * another failed save shows a toast.
 */
export function RoutineEditor(
  props: Source & {
    org: OrgSummary
    user: User
    repositories: readonly Repository[]
    sections: readonly Section[]
  },
) {
  const { org, routine } = props
  const models = useStore(useApp().models)
  const orgModel = useOrgModel(org.id)
  const members = valueOf(useStore(orgModel.members))?.members ?? []
  const navigation = useNavigation()
  const phone = useViewport() === 'phone'
  const { toast } = useToast()
  const saved = useMemo(
    () => (routine ? draftOf(routine) : props.initial),
    [routine, props.initial],
  )
  const form = useSavedDraft(saved, sameDraft)
  const { draft } = form
  const save = useAction(async () => {
    try {
      if (!routine) {
        const created = await createRoutine(orgModel, createRequest(draft))
        navigation.replace(routes.routine(org.id, created.id))
        return
      }
      await form.save(async (value) => {
        await updateRoutine(orgModel, routine.id, updateRequest(saved, value))
      })
    } catch (error) {
      const problem = asApiError(error)
      if (problem.code !== unknownLogin) {
        toast({
          title: 'The routine was not saved',
          description: problem.message,
          tone: 'error',
        })
      }
      throw error
    }
  })
  const deletion = useDeleteRoutine(org, routine)
  const refusal = save.error?.code === unknownLogin ? save.error.message : null
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
  const actions = (
    <>
      {routine && !phone ? (
        <ActionButton icon={Trash2} onPress={deletion.ask} tone="danger">
          Delete
        </ActionButton>
      ) : null}
      <ActionButton
        busy={save.pending}
        disabled={!ready}
        keepFocus
        onPress={() => save.run()}
        tone="primary"
      >
        Save
      </ActionButton>
    </>
  )
  return (
    <RoutineFrame
      actions={actions}
      org={org}
      title={routine ? routine.name : 'New routine'}
    >
      {routine ? (
        <RoutineNote
          access="owner"
          org={org}
          repositoryName={repositoryName}
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
