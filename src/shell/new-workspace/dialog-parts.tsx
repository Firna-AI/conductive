import { CornerDownLeft } from 'lucide-react'
import { classes } from '../../ui/components/common/classes'
import card from '../../ui/components/common/ModalCard.module.css'
import styles from '../../ui/components/new-workspace/NewWorkspaceDialog.module.css'
import type { NewWorkspaceModel } from '../../app/new-workspace-model'
import { defaultSection } from '../../app/sections'
import { useStore, valueOf } from '../../app/store'
import type { OrgSummary } from '../../shared/orgs'
import { useOrgModel } from '../context'
import { ActionButton } from '../ui/actions'
import { BranchControl } from './BranchPicker'
import { RepositoryMenu, SectionMenu } from './parts'
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
 * close right of it at the start, and the menu of the section at the end.
 * The buttons show no chevrons. On the default branch the branch control
 * is only a muted icon. The target of a picked branch lives in the
 * dropdown of the branch control (decision 309), so no line follows the
 * header. A suspended org refuses each create, so it shows no pickers.
 * While the sections load, the end of the header stays empty.
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
    <div className={classes(styles.header, card.head)}>
      {repository ? (
        <span className={styles.source}>
          <RepositoryMenu
            choose={(id) => model.setRepository(id)}
            chosen={repository}
            repositories={form.repositories ?? []}
            tone="plain"
            waiting={form.waiting}
          />
          {branch ? (
            <BranchControl
              branch={branch}
              choose={form.chooseTarget}
              compact
              orgId={org.id}
              pick={form.pickBranch}
              repository={repository}
            />
          ) : null}
        </span>
      ) : null}
      {section ? (
        <SectionMenu
          choose={(id) => model.setSection(id)}
          chosen={section}
          className={classes(styles.anchor, styles.placeMenu)}
          disabled={props.sending}
          sections={sections}
        />
      ) : null}
    </div>
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
