import { CornerDownLeft } from 'lucide-react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import styles from '../../../docs/mockups/src/components/new-workspace/NewWorkspaceDialog.module.css'
import type { NewWorkspaceModel } from '../../app/new-workspace-model'
import { defaultSection } from '../../app/sections'
import { useStore, valueOf } from '../../app/store'
import type { OrgSummary } from '../../shared/orgs'
import { useOrgModel } from '../context'
import { ActionButton } from '../ui/actions'
import { BranchControl } from './BranchPicker'
import { RepositoryMenu, SectionMenu } from './parts'
import { TargetChoice } from './TargetChoice'
import type { NewWorkspaceForm } from './useNewWorkspaceForm'

// The parts of the New workspace dialog around its message.

/**
 * The section that the new workspace joins, such as General: the pick of
 * the draft, else the section of the dialog. It is `undefined` while the
 * sections load, and for a section that the org no longer has.
 */
function useSection(org: OrgSummary, model: NewWorkspaceModel) {
  const sections = valueOf(useStore(useOrgModel(org.id).sections)) ?? []
  const id = useStore(model.draft).sectionId ?? model.sectionId
  const section =
    id === null
      ? defaultSection(sections)
      : sections.find((item) => item.id === id)
  return { sections, section }
}

/**
 * The header of the dialog: the repository picker and the branch control
 * at the start, and the menu of the org and the section at the end. A
 * picked branch that is not the default branch adds the target choice on a
 * line of its own under the header, with its line beside it when the two
 * fit. A suspended org refuses each create, so it shows no pickers.
 */
export function DialogHeader(props: {
  org: OrgSummary
  model: NewWorkspaceModel
  form: NewWorkspaceForm
  suspended: boolean
  sending: boolean
}) {
  const { org, model, form } = props
  const { sections, section } = useSection(org, model)
  const repository = props.suspended ? undefined : form.repository
  const branch = repository ? form.branch : undefined
  return (
    <>
      <div className={styles.header}>
        {repository ? (
          <RepositoryMenu
            chevron={styles.chevron}
            choose={(id) => model.setRepository(id)}
            chosen={repository}
            repositories={form.repositories ?? []}
            tone="plain"
            waiting={form.waiting}
          />
        ) : null}
        {repository && branch ? (
          <BranchControl
            branch={branch}
            orgId={org.id}
            pick={form.pickBranch}
            repository={repository}
            tone="plain"
          />
        ) : null}
        {section ? (
          <SectionMenu
            chevron={styles.chevron}
            choose={(id) => model.setSection(id)}
            chosen={section}
            className={classes(styles.anchor, styles.placeMenu)}
            disabled={props.sending}
            org={org.name}
            sections={sections}
          />
        ) : (
          <span className={styles.place}>{org.name}</span>
        )}
      </div>
      {branch?.target ? (
        <div className={styles.target}>
          <TargetChoice
            choose={form.chooseTarget}
            defaultBranch={branch.defaultBranch}
            inline
            picked={branch.name}
            value={branch.target}
          />
        </div>
      ) : null}
    </>
  )
}

/**
 * Create, with the hint of its key: on a computer, Enter creates the
 * workspace. Create is off until the message can go.
 */
export function CreateButton(props: {
  ready: boolean
  busy: boolean
  create: () => void
}) {
  return (
    <ActionButton
      busy={props.busy}
      disabled={!props.ready}
      onPress={props.create}
      tone={props.ready ? 'primary' : 'secondary'}
      trailing={
        <CornerDownLeft
          aria-hidden
          className={classes(styles.key, props.ready && styles.keyOnSolid)}
          size={13}
        />
      }
    >
      Create
    </ActionButton>
  )
}
