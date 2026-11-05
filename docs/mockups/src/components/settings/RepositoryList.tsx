import { InputFrame } from '@firna/ui/input'
import { Check, FolderGit2, Plus, Search, X } from 'lucide-react'
import type { ReachableRepository } from '../../fixtures/repositories'
import { noop } from '../../noop'
import { ActionButton, IconButton } from '../common/actions'
import { ExternalLink } from '../common/ExternalLink'
import { useControlSizes } from '../common/touch'
import styles from './RepositoryList.module.css'

const githubAccessUrl = 'https://github.com/settings/installations'

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
 * The repositories that the shared GitHub App can reach, with the ones that
 * the org uses marked as added. A search narrows the list.
 */
export function RepositoryList(props: {
  repositories: readonly ReachableRepository[]
  search: string
}) {
  const { field } = useControlSizes()
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
