import { Check, FolderGit2 } from 'lucide-react'
import type { ReachableRepository } from '../../fixtures/repositories'
import {
  actionButton,
  iconButton,
} from '../../entries/components/common/actions.mockup'
import { emptyState } from '../../entries/components/common/EmptyState.mockup'
import { externalLink } from '../../entries/components/common/ExternalLink.mockup'
import { searchField } from '../../entries/components/common/SearchField.mockup'
import { instanceKey } from '../../instanceKey'
import styles from '../../../../../src/ui/components/settings/RepositoryList.module.css'

/**
 * The page of the GitHub App, which lists the person's GitHub accounts.
 * The app gets the slug of its GitHub App from the Worker.
 */
const githubAccessUrl = 'https://github.com/apps/conductive/installations/new'

/** One repository, with its Add or Remove. */
function Row(props: { repository: ReachableRepository }) {
  const { repository } = props
  return (
    <li className={styles.row}>
      <FolderGit2 aria-hidden className={styles.icon} size={15} />
      <span className={styles.text}>
        <span className={styles.name}>{repository.name}</span>
        <span className={styles.description}>{repository.description}</span>
      </span>
      {repository.used ? (
        <>
          <span className={styles.added}>
            <Check aria-hidden size={13} />
            Added
          </span>
          <iconButton.Component
            icon="x"
            label={`Remove ${repository.name}`}
            moklyInstance={`remove-${instanceKey(repository.name)}`}
            quiet
          />
        </>
      ) : (
        <actionButton.Component
          accessibilityLabel={`Add ${repository.name}`}
          icon="plus"
          moklyInstance={`add-${instanceKey(repository.name)}`}
        >
          Add
        </actionButton.Component>
      )}
    </li>
  )
}

/**
 * The repositories that the shared GitHub App can reach, by name, with the
 * ones that the org uses marked as added. A search narrows the list. When the app
 * reaches no repository, the list asks for access, with Manage access.
 */
export function RepositoryList(props: {
  repositories: readonly ReachableRepository[]
  search: string
}) {
  if (props.repositories.length === 0) {
    return (
      <emptyState.Component
        moklyInstance="no-repositories"
        action={
          <externalLink.Component
            href={githubAccessUrl}
            moklyInstance="grant-access"
          >
            Manage access
          </externalLink.Component>
        }
        body="The repositories that the GitHub App can reach show here."
        icon="folder-git-2"
        title="Give the GitHub App access to a repository"
      />
    )
  }
  return (
    <div className={styles.picker}>
      <searchField.Component
        label="Search repositories"
        moklyInstance="search-repositories"
        placeholder="Search repositories"
        query={props.search}
      />
      <ul aria-label="Repositories" className={styles.list}>
        {[...props.repositories]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((repository) => (
            <Row key={repository.name} repository={repository} />
          ))}
      </ul>
      <p className={styles.note}>
        The list shows the repositories that the GitHub App can reach.{' '}
        <externalLink.Component
          href={githubAccessUrl}
          moklyInstance="manage-access"
        >
          Manage access
        </externalLink.Component>
      </p>
    </div>
  )
}

/**
 * Edit, which opens the whole list with search, Add, and Remove, or Done,
 * which saves the changes of the edit and closes it. Only an admin gets it.
 */
export function RepositoryEditToggle(props: { editing: boolean }) {
  return props.editing ? (
    <actionButton.Component icon="check" moklyInstance="done-repositories">
      Done
    </actionButton.Component>
  ) : (
    <actionButton.Component icon="pencil" moklyInstance="edit-repositories">
      Edit
    </actionButton.Component>
  )
}
