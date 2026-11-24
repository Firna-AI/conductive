import type { RefCallback } from 'react'
import { Check, Pencil } from 'lucide-react'
import {
  compareRepositoryNames,
  type Repository,
} from '../../shared/org-settings'
import { ActionButton } from '../ui/actions'
import { ChoiceActions, RepositorySearch } from './RepositorySearch'

/**
 * Edit, which opens the whole list with search, Add, and Remove, or Done,
 * which saves the changes of the edit and closes it. Done starts the
 * build of the added repositories. It shows a spinner while it saves.
 * `buttonRef` takes the button, for an owner that moves the focus to it.
 */
export function RepositoryEditToggle(props: {
  editing: boolean
  toggle: () => void
  busy?: boolean
  buttonRef?: RefCallback<unknown>
}) {
  return props.editing ? (
    <ActionButton
      busy={props.busy}
      buttonRef={props.buttonRef}
      icon={Check}
      onPress={props.toggle}
    >
      Done
    </ActionButton>
  ) : (
    <ActionButton
      buttonRef={props.buttonRef}
      icon={Pencil}
      onPress={props.toggle}
    >
      Edit
    </ActionButton>
  )
}

/**
 * The repositories that the shared GitHub App can reach, by name, with the
 * ones that the org uses marked as added. A search narrows the list by full
 * name. The list shows the repositories as the open edit wants them. Each
 * Add and Remove changes only the edit, until Done saves it. While Done
 * saves, the rows are off.
 */
export function RepositoryPicker(props: {
  repositories: readonly Repository[]
  change: (repository: Repository, selected: boolean) => void
  disabled?: boolean
}) {
  return (
    <RepositorySearch
      actions={(repository) => (
        <ChoiceActions
          disabled={props.disabled}
          name={repository.fullName}
          press={(selected) => props.change(repository, selected)}
          selected={repository.selected}
        />
      )}
      keyOf={(repository) => repository.id}
      repositories={[...props.repositories].sort(compareRepositoryNames)}
    />
  )
}
