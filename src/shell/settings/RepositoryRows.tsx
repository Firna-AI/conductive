import type { ReactNode } from 'react'
import { FolderGit2 } from 'lucide-react'
import { EmptyState } from '../../../docs/mockups/src/components/common/EmptyState'
import styles from '../../../docs/mockups/src/components/settings/RepositoryList.module.css'
import type { Repository } from '../../shared/org-settings'

/** What a row shows of a repository of the org or of the GitHub catalogue. */
export type ListedRepository = Pick<Repository, 'fullName' | 'description'>

/** One repository: its full name and its description, then its actions. */
export function RepositoryRow(props: {
  repository: ListedRepository
  children?: ReactNode
}) {
  const { repository } = props
  return (
    <li className={styles.row}>
      <FolderGit2 aria-hidden className={styles.icon} size={15} />
      <span className={styles.text}>
        <span className={styles.name}>{repository.fullName}</span>
        {repository.description === '' ? null : (
          <span className={styles.description}>{repository.description}</span>
        )}
      </span>
      {props.children}
    </li>
  )
}

/**
 * The repositories that the org uses, without search and actions, for a
 * member who is not an admin (decision 57).
 */
export function ChosenRepositories(props: {
  orgName: string
  repositories: readonly Repository[]
}) {
  const chosen = props.repositories.filter((repository) => repository.selected)
  if (chosen.length === 0) {
    return (
      <EmptyState
        body={`An admin of ${props.orgName} adds them here.`}
        icon={FolderGit2}
        title="No repositories yet"
      />
    )
  }
  return (
    <ul aria-label="Repositories" className={styles.list}>
      {chosen.map((repository) => (
        <RepositoryRow key={repository.id} repository={repository} />
      ))}
    </ul>
  )
}
