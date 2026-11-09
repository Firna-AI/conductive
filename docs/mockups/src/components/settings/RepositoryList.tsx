import { InputFrame } from '@firna/ui/input'
import { Check, FolderGit2, Plus, Search, X } from 'lucide-react'
import type { ReachableRepository } from '../../fixtures/repositories'
import { noop } from '../../noop'
import { ActionButton, IconButton } from '../common/actions'
import { EmptyState } from '../common/EmptyState'
import { ExternalLink } from '../common/ExternalLink'
import { useControlSizes } from '../common/touch'
import styles from './RepositoryList.module.css'

/**
 * The page of the GitHub App, which lists the person's GitHub accounts.
 * The app gets the slug of its GitHub App from the Worker.
 */
const githubAccessUrl = 'https://github.com/apps/conductive/installations/new'

/** One repository. `readOnly` drops its Add or Remove. */
function Row(props: { repository: ReachableRepository; readOnly?: boolean }) {
  const { repository } = props
  return (
    <li className={styles.row}>
      <FolderGit2 aria-hidden className={styles.icon} size={15} />
      <span className={styles.text}>
        <span className={styles.name}>{repository.name}</span>
        <span className={styles.description}>{repository.description}</span>
      </span>
      {props.readOnly ? null : repository.used ? (
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
 * The repositories that the shared GitHub App can reach, with the ones that
 * the org uses marked as added. A search narrows the list. When the app
 * reaches no repository, the list asks for access, with Manage access.
 */
export function RepositoryList(props: {
  repositories: readonly ReachableRepository[]
  search: string
}) {
  const { field } = useControlSizes()
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
      <InputFrame
        accessibilityLabel="Search repositories"
        onChangeText={noop}
        placeholder="Search repositories"
        prefixIcon={Search}
        size={field}
        value={props.search}
      />
      <ul aria-label="Repositories" className={styles.list}>
        {props.repositories.map((repository) => (
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
 * The repositories that the org uses, without search and actions, for a
 * member who is not an admin (decision 57).
 */
export function OrgRepositoryList(props: {
  repositories: readonly ReachableRepository[]
}) {
  return (
    <ul aria-label="Repositories" className={styles.list}>
      {props.repositories
        .filter((repository) => repository.used)
        .map((repository) => (
          <Row key={repository.name} readOnly repository={repository} />
        ))}
    </ul>
  )
}
