import { useState } from 'react'
import { InputFrame } from '@firna/ui/input'
import { Check, FolderGit2, Plus, Search, X } from 'lucide-react'
import { EmptyState } from '../../../docs/mockups/src/components/common/EmptyState'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import styles from '../../../docs/mockups/src/components/settings/RepositoryList.module.css'
import type { OrgModel } from '../../app/org-model'
import { setRepositorySelected } from '../../app/settings-actions'
import type { Repository } from '../../shared/org-settings'
import { ActionButton, IconButton } from '../ui/actions'
import { ExternalLink } from '../ui/links'
import { useAction } from '../ui/useAction'
import { RepositoryRow } from './RepositoryRows'

/** The page of GitHub where a person chooses what the GitHub App reaches. */
const githubAccessUrl = 'https://github.com/settings/installations'

function ManageAccess() {
  return <ExternalLink href={githubAccessUrl}>Manage access</ExternalLink>
}

/**
 * Added and Remove, or Add. While one change runs, the other rows wait,
 * because each write names every repository that the org keeps.
 */
function RowActions(props: {
  repository: Repository
  pending: boolean
  busy: boolean
  press: (selected: boolean) => void
}) {
  const { repository } = props
  if (repository.selected) {
    return (
      <>
        <span className={styles.added}>
          <Check aria-hidden size={13} />
          Added
        </span>
        <IconButton
          busy={props.busy}
          disabled={props.pending && !props.busy}
          icon={X}
          label={`Remove ${repository.fullName}`}
          onPress={() => props.press(false)}
          quiet
        />
      </>
    )
  }
  return (
    <ActionButton
      accessibilityLabel={`Add ${repository.fullName}`}
      busy={props.busy}
      disabled={props.pending && !props.busy}
      icon={Plus}
      onPress={() => props.press(true)}
    >
      Add
    </ActionButton>
  )
}

/**
 * The repositories that the shared GitHub App can reach, with the ones that
 * the org uses marked as added. A search narrows the list by full name.
 */
export function RepositoryPicker(props: {
  model: OrgModel
  repositories: readonly Repository[]
}) {
  const { field } = useControlSizes()
  const [search, setSearch] = useState('')
  const [target, setTarget] = useState<string | null>(null)
  const change = useAction(
    (repository: Repository, selected: boolean) =>
      setRepositorySelected(props.model, repository, selected),
    'The repositories did not change',
  )
  if (props.repositories.length === 0) {
    return (
      <EmptyState
        action={<ManageAccess />}
        body="The repositories that the GitHub App can reach show here."
        icon={FolderGit2}
        title="Give the GitHub App access to a repository"
      />
    )
  }
  const query = search.trim().toLowerCase()
  const shown = props.repositories.filter((repository) =>
    repository.fullName.toLowerCase().includes(query),
  )
  return (
    <div className={styles.picker}>
      <InputFrame
        accessibilityLabel="Search repositories"
        onChangeText={setSearch}
        placeholder="Search repositories"
        prefixIcon={Search}
        size={field}
        value={search}
      />
      {shown.length > 0 ? (
        <ul aria-label="Repositories" className={styles.list}>
          {shown.map((repository) => (
            <RepositoryRow key={repository.id} repository={repository}>
              <RowActions
                busy={change.pending && target === repository.id}
                pending={change.pending}
                press={(selected) => {
                  setTarget(repository.id)
                  change.run(repository, selected)
                }}
                repository={repository}
              />
            </RepositoryRow>
          ))}
        </ul>
      ) : (
        <p className={styles.note}>No repository matches “{search.trim()}”.</p>
      )}
      <p className={styles.note}>
        The list shows the repositories that the GitHub App can reach.{' '}
        <ManageAccess />
      </p>
    </div>
  )
}
