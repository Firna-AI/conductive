import { useState } from 'react'
import type { OrgModel } from '../../app/org-model'
import { setRepositorySelected } from '../../app/settings-actions'
import type { Repository } from '../../shared/org-settings'
import { useAction } from '../ui/useAction'
import { ChoiceActions, RepositorySearch } from './RepositorySearch'

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
