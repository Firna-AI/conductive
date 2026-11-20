import { Check, FolderGit2, Pencil, Plus, X } from 'lucide-react'
import type { ReachableRepository } from '../../fixtures/repositories'
import { ActionButton, IconButton } from '../common/actions'
import { EmptyState } from '../common/EmptyState'
import { ExternalLink } from '../common/ExternalLink'
import { SearchField } from '../common/SearchField'
import styles from './RepositoryList.module.css'

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
          <IconButton icon={X} label={`Remove ${repository.name}`} quiet />
        </>
      ) : (
        <ActionButton accessibilityLabel={`Add ${repository.name}`} icon={Plus}>
          Add
        </ActionButton>
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
      <EmptyState
        action={
          <ExternalLink href={githubAccessUrl}>Manage access</ExternalLink>
        }
        body="The repositories that the GitHub App can reach show here."
        icon={FolderGit2}
        title="Give the GitHub App access to a repository"
      />
    )
  }
  return (
    <div className={styles.picker}>
      <SearchField
        label="Search repositories"
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
        <ExternalLink href={githubAccessUrl}>Manage access</ExternalLink>
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
    <ActionButton icon={Check}>Done</ActionButton>
  ) : (
    <ActionButton icon={Pencil}>Edit</ActionButton>
  )
}
