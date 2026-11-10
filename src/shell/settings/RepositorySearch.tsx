import { useState, type ReactNode } from 'react'
import { InputFrame } from '@firna/ui/input'
import { Check, FolderGit2, Plus, Search, X } from 'lucide-react'
import { EmptyState } from '../../../docs/mockups/src/components/common/EmptyState'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import styles from '../../../docs/mockups/src/components/settings/RepositoryList.module.css'
import { useStore } from '../../app/store'
import { useGitHubInstallLink } from '../account/githubInstall'
import { useApp } from '../context'
import { ActionButton, IconButton } from '../ui/actions'
import { ExternalLink } from '../ui/links'
import { RepositoryRow, type ListedRepository } from './RepositoryRows'

/**
 * The page of the GitHub App, which lists the GitHub accounts of the
 * person, personal and org alike. There the person picks an account and
 * chooses the repositories that the app reaches. The return from GitHub
 * opens the screen of the list again.
 */
function ManageAccess() {
  const app = useApp()
  const account = useStore(app.account.account)
  const link = useGitHubInstallLink()
  if (!account) return null
  return (
    <ExternalLink href={link(account.githubAppUrl)}>Manage access</ExternalLink>
  )
}

/** Added and Remove, or Add, for one repository. */
export function ChoiceActions(props: {
  name: string
  selected: boolean
  press: (selected: boolean) => void
  /** The change of this repository runs. */
  busy?: boolean
  disabled?: boolean
}) {
  if (props.selected) {
    return (
      <>
        <span className={styles.added}>
          <Check aria-hidden size={13} />
          Added
        </span>
        <IconButton
          busy={props.busy}
          disabled={props.disabled}
          icon={X}
          label={`Remove ${props.name}`}
          onPress={() => props.press(false)}
          quiet
        />
      </>
    )
  }
  return (
    <ActionButton
      accessibilityLabel={`Add ${props.name}`}
      busy={props.busy}
      disabled={props.disabled}
      icon={Plus}
      onPress={() => props.press(true)}
    >
      Add
    </ActionButton>
  )
}

/**
 * The repositories that the shared GitHub App can reach, each with its
 * actions. A search narrows the list by full name. An empty list says how
 * to give the GitHub App access.
 */
export function RepositorySearch<T extends ListedRepository>(props: {
  repositories: readonly T[]
  keyOf: (repository: T) => string | number
  actions: (repository: T) => ReactNode
}) {
  const { field } = useControlSizes()
  const [search, setSearch] = useState('')
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
            <RepositoryRow
              key={props.keyOf(repository)}
              repository={repository}
            >
              {props.actions(repository)}
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
