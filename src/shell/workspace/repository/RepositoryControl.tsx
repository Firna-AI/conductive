import { useEffect, useRef } from 'react'
import { FolderGit2 } from 'lucide-react'
import { useToast } from '@firna/ui/toast'
import picker from '../../../ui/components/workspace/RepositoryPicker.module.css'
import { RepositoryButton } from '../../../ui/components/workspace/RepositoryButton'
import header from '../../../ui/components/workspace/WorkspaceHeader.module.css'
import {
  repositoryFailure,
  repositoryMenu,
} from '../../../ui/components/workspace/repositoryMoveCopy'
import { useStore, valueOf } from '../../../app/store'
import { nameLabel } from '../../../shared/name-label'
import { useOrgModel } from '../../context'
import { MenuButton, type MenuEntry } from '../../ui/Menu'
import type { WorkspaceContext } from '../features'
import { useHeldRepositories } from '../saved-view'
import type { RepositoryChangeSnapshot } from './repository-change'
import { RepositoryQuestion } from './RepositoryQuestion'
import { repositoryChoices, useRepositoryChange } from './use-repository-change'

/** The repository as text, where the menu has nothing to pick. */
function PlainRepository(props: { name: string; phone: boolean }) {
  if (props.phone) return <span className={header.branch}>{props.name}</span>
  return (
    <span className={header.meta}>
      <FolderGit2 aria-hidden className={header.icon} size={13} />
      <span className={header.branch}>{props.name}</span>
    </span>
  )
}

/** Shows each new failure of the change once, in a toast. */
function useFailureToast(failure: RepositoryChangeSnapshot['failure']): void {
  const { toast } = useToast()
  const shown = useRef(failure)
  useEffect(() => {
    if (!failure || failure === shown.current) return
    shown.current = failure
    toast({
      title: repositoryFailure.title,
      description: failure.message,
      tone: 'error',
    })
  }, [failure, toast])
}

/**
 * The repository of the open workspace in its header. Every member of the
 * org may change it (repository change decision 2 B). Its menu lists the
 * current repository with a check, and each other repository that the org
 * chose and that the cloud computer holds. Desktop opens the menu below the
 * button, and a phone opens a sheet. A pick of another repository starts
 * the change at once, or asks first when the workspace has work, as
 * `RepositoryQuestion` says. While the change runs, the button shows a
 * spinner and the new repository. A failure shows a toast. An archived
 * workspace, a suspended org, and a menu with nothing to pick show the
 * repository as text.
 */
export function RepositoryControl(props: { context: WorkspaceContext }) {
  const { context } = props
  const { workspace } = context
  const model = useOrgModel(context.org.id)
  const repositories = valueOf(useStore(model.repositories))
  useEffect(() => model.watch('repositories'), [model])
  const held = useHeldRepositories(context.savedView)
  const { change, snapshot } = useRepositoryChange(context)
  useFailureToast(snapshot.failure)
  const phone = context.viewport === 'phone'
  const current = workspace.repositoryId
  const name =
    repositories?.find((item) => item.id === current)?.fullName ?? current
  const choices = repositoryChoices(repositories, held, current)
  const question = snapshot.question ? (
    <RepositoryQuestion change={change} question={snapshot.question} />
  ) : null
  if (snapshot.changing) {
    return (
      <span className={picker.anchor}>
        <RepositoryButton
          changing
          inline={phone}
          name={snapshot.changing.fullName}
        />
      </span>
    )
  }
  if (context.readOnly || !choices.some((item) => item.id !== current)) {
    return (
      <>
        <PlainRepository name={name} phone={phone} />
        {question}
      </>
    )
  }
  const entries: MenuEntry[] = [
    { kind: 'label', label: repositoryMenu.label },
    ...choices.map((repository): MenuEntry => ({
      kind: 'item',
      id: repository.id,
      label: repository.fullName,
      checked: repository.id === current,
      onSelect: () => {
        if (repository.id === current) return
        void change.change(
          {
            expectedRepositoryId: current,
            expectedBranch: workspace.branch,
            repositoryId: repository.id,
          },
          name,
          { id: repository.id, fullName: repository.fullName },
        )
      },
    })),
  ]
  return (
    <>
      <MenuButton
        className={picker.anchor}
        entries={entries}
        label={repositoryMenu.label}
        placement="below-start"
        sheetTitle={nameLabel(workspace.name)}
        trigger={({ open, toggle }) => (
          <RepositoryButton
            expanded={open}
            inline={phone}
            name={name}
            onPress={toggle}
          />
        )}
        wide
      />
      {question}
    </>
  )
}
