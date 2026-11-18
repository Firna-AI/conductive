import { useState } from 'react'
import { Check, Pencil } from 'lucide-react'
import { SectionText } from '../../../docs/mockups/src/components/settings/Section'
import styles from '../../../docs/mockups/src/components/settings/RepositoryList.module.css'
import type { OrgModel } from '../../app/org-model'
import { setRepositorySelected } from '../../app/settings-actions'
import type { Repository } from '../../shared/org-settings'
import { ActionButton } from '../ui/actions'
import { useAction } from '../ui/useAction'
import { RepositoryRow } from './RepositoryRows'
import { ChoiceActions, RepositorySearch } from './RepositorySearch'

/**
 * Edit, which opens the whole list with search, Add, and Remove, or Done,
 * which closes it again. Each Add and Remove saves at once, so Done saves
 * nothing.
 */
export function RepositoryEditToggle(props: {
  editing: boolean
  toggle: () => void
}) {
  return props.editing ? (
    <ActionButton icon={Check} onPress={props.toggle}>
      Done
    </ActionButton>
  ) : (
    <ActionButton icon={Pencil} onPress={props.toggle}>
      Edit
    </ActionButton>
  )
}

/** The repositories that the org chose, without actions, until Edit. */
export function ChosenRepositories(props: {
  repositories: readonly Repository[]
}) {
  const chosen = props.repositories.filter((repository) => repository.selected)
  if (chosen.length === 0) {
    return <SectionText muted>Select Edit to add a repository.</SectionText>
  }
  return (
    <ul aria-label="Repositories" className={styles.list}>
      {chosen.map((repository) => (
        <RepositoryRow key={repository.id} repository={repository} />
      ))}
    </ul>
  )
}

/**
 * The repositories that the shared GitHub App can reach, with the ones that
 * the org uses marked as added. A search narrows the list by full name.
 * Each change adds or removes one repository. While one change runs, the
 * other rows wait, so the list shows one change at a time.
 */
export function RepositoryPicker(props: {
  model: OrgModel
  repositories: readonly Repository[]
}) {
  const [target, setTarget] = useState<string | null>(null)
  const change = useAction(
    (repository: Repository, selected: boolean) =>
      setRepositorySelected(props.model, repository, selected),
    'The repositories did not change',
  )
  return (
    <RepositorySearch
      actions={(repository) => {
        const busy = change.pending && target === repository.id
        return (
          <ChoiceActions
            busy={busy}
            disabled={change.pending && !busy}
            name={repository.fullName}
            press={(selected) => {
              setTarget(repository.id)
              change.run(repository, selected)
            }}
            selected={repository.selected}
          />
        )
      }}
      keyOf={(repository) => repository.id}
      repositories={props.repositories}
    />
  )
}
