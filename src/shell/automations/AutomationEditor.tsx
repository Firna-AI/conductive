import { useMemo } from 'react'
import { Trash2 } from 'lucide-react'
import {
  hasPullRequestTrigger,
  offersRunNow,
} from '../../ui/components/automations/triggerCopy'
import styles from '../../ui/screens/AutomationScreen.module.css'
import {
  draftFields,
  draftOf,
  draftReady,
  sameDraft,
  withChosenSecret,
  type AutomationDraft,
} from '../../app/automation-draft'
import { newSessionLogin } from '../../app/default-logins'
import type { AutomationTab } from '../../app/router'
import { useStore, valueOf } from '../../app/store'
import type { User } from '../../shared/api'
import type { Repository } from '../../shared/org-settings'
import type { OrgSummary } from '../../shared/orgs'
import type { Automation } from '../../shared/automations'
import type { Section } from '../../shared/sections'
import { automationCapabilities } from '../capabilities/AutomationCapabilities'
import { useApp, useOfferedModels, useOrgModel } from '../context'
import { ActionButton } from '../ui/actions'
import { eachField, useSavedDraft } from '../ui/useSavedDraft'
import { useViewport } from '../ui/viewport'
import { useDeleteAutomation } from './DeleteAutomation'
import { PromptEditor } from './PromptBox'
import { PromptTool } from './PromptTool'
import { AutomationFields } from './AutomationFields'
import { AutomationFrame } from './AutomationFrame'
import { AutomationNote } from './AutomationNote'
import { RunNowButton } from './RunNow'
import { RunsPanel, type RunsSource } from './RunsPanel'
import { useChosenSecretNames, type NamedSecret } from './RunSecrets'
import { TriggerEditor } from './TriggerList'
import { useAutomationSave } from './useAutomationSave'

/**
 * The form follows a newer saved automation field by field, so an edit stays,
 * and a field that changed elsewhere, such as Active after a turn-off,
 * shows its new value.
 */
const followEachField = eachField(draftFields)

/**
 * A saved automation with its runs and the names of its chosen secrets, as
 * its answer gives them, or null when that answer names none. Or the draft
 * of a new one, which the first save creates.
 */
type Source =
  | {
      automation: Automation
      chosenSecrets: readonly NamedSecret[] | null
      initial?: undefined
      runs: RunsSource
    }
  | {
      automation: null
      chosenSecrets?: undefined
      initial: AutomationDraft
      runs: null
    }

/**
 * The automation page of its owner: the fields, the triggers, and the prompt,
 * with Save, Run now, and Delete, beside the Runs list. Save stays off while
 * nothing changed, while the prompt has no text, and while the form refuses
 * a cron. Run now shows on a saved automation that has a schedule or no
 * trigger. A phone shows Save on the Automation tab only. The Capabilities
 * icon of the prompt chooses the secrets of the runs, and the lines under
 * the prompt follow the form, also before Save.
 */
export function AutomationEditor(
  props: Source & {
    org: OrgSummary
    user: User
    repositories: readonly Repository[]
    sections: readonly Section[]
    tab: AutomationTab
  },
) {
  const { org, automation } = props
  const orgModel = useOrgModel(org.id)
  const members = valueOf(useStore(orgModel.members))?.members ?? []
  const phone = useViewport() === 'phone'
  const saved = useMemo(
    () => (automation ? draftOf(automation) : props.initial),
    [automation, props.initial],
  )
  const form = useSavedDraft(saved, followEachField)
  const { draft } = form
  const account = useStore(useApp().account.account)
  // A run takes the default login of its owner, the person here, so the
  // picker follows the list of that login (org login decisions 5 A and 3 A).
  const models = useOfferedModels(draft.choice, org.id)
  const runsOnOrg =
    account !== null &&
    newSessionLogin(account, org.id, draft.choice.agent) === 'org'
  const { save, refused, refusal } = useAutomationSave({
    org,
    automation,
    form,
    saved,
  })
  const deletion = useDeleteAutomation(org, automation)
  const change = (next: AutomationDraft) => {
    if (next.triggers !== draft.triggers) save.reset()
    form.change(next)
  }
  const ready = draftReady(draft) && (!automation || !sameDraft(draft, saved))
  const chosen = draft.capabilities.preapprovedSecretIds
  const secretNames = useChosenSecretNames(
    org.id,
    chosen,
    automation,
    props.chosenSecrets ?? null,
  )
  const capabilities = automationCapabilities(org, {
    ids: chosen,
    choose: (secretId, on) => change(withChosenSecret(draft, secretId, on)),
    disabled: save.pending,
  })
  const repositoryName =
    props.repositories.find((item) => item.id === draft.repositoryId)
      ?.fullName ?? draft.repositoryId
  const owner = automation?.owner ?? {
    id: props.user.id,
    githubLogin: props.user.githubLogin,
    displayName: props.user.displayName,
    avatarUrl: props.user.avatarUrl,
  }
  const deleteButton =
    automation && !phone ? (
      <ActionButton icon={Trash2} onPress={deletion.ask} tone="danger">
        Delete
      </ActionButton>
    ) : null
  const runNow =
    automation && offersRunNow(saved.triggers) ? (
      <RunNowButton org={org} automation={automation} tab={props.tab} />
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
    <AutomationFrame
      actions={actions}
      org={org}
      runs={
        <RunsPanel
          orgName={org.name}
          source={props.runs}
          viewer={props.user.id}
        />
      }
      tabs={
        automation
          ? { automationId: automation.id, current: props.tab }
          : undefined
      }
      title={automation ? automation.name : 'New automation'}
    >
      {automation ? (
        <AutomationNote
          access="owner"
          org={org}
          repositories={props.repositories}
          automation={automation}
        />
      ) : null}
      <AutomationFields
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
        favourites={account?.favourites ?? []}
        login={runsOnOrg ? `${org.name}'s` : 'your'}
        models={models}
        prompt={draft.prompt}
        pullRequest={hasPullRequestTrigger(draft.triggers)}
        secrets={secretNames}
        tool={<PromptTool disabled={save.pending} tool={capabilities} />}
      />
      {automation && phone ? (
        <div className={styles.phoneDelete}>
          <ActionButton icon={Trash2} onPress={deletion.ask} tone="danger">
            Delete automation
          </ActionButton>
        </div>
      ) : null}
      {deletion.question}
    </AutomationFrame>
  )
}
