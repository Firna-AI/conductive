import { ChevronDown, Sparkles } from 'lucide-react'
import { actionButton } from '../entries/components/common/actions.mockup'
import { menu } from '../entries/components/common/Menu.mockup'
import type { MenuEntryData } from '../entries/components/common/menuEntries'
import {
  ChooseRepositoriesButton,
  chooseRepositoriesFirst,
} from '../components/new-workspace/notices'
import { formWait } from '../components/new-workspace/waitingRepository'
import type { PageOrg } from './newWorkspacePageParts'
import styles from './NewWorkspaceScreen.module.css'

/**
 * The repository of the new workspace, as a compact picker. `menu` draws
 * its menu open below it, on a computer. A phone opens it as a sheet.
 */
function RepositoryPicker(props: {
  repository: string
  menu?: readonly MenuEntryData[]
}) {
  return (
    <span className={styles.anchor}>
      <actionButton.Component
        accessibilityLabel={`Repository: ${props.repository}`}
        expanded={props.menu !== undefined}
        icon="folder-git-2"
        menu
        moklyInstance="repository"
        trailing={
          <ChevronDown aria-hidden className={styles.chevron} size={13} />
        }
      >
        {props.repository}
      </actionButton.Component>
      {props.menu ? (
        <menu.Component
          entries={props.menu}
          label="Repository"
          moklyInstance="repository-menu"
          placement="below-start"
        />
      ) : null}
    </span>
  )
}

/**
 * The start of an empty chat, with the repository of the new workspace.
 * The note names the build that the workspace starts from. Before the
 * first good build there is none, and the notice over the composer says
 * why. While the repository of the form waits for its build, the notice
 * over the composer says when it is ready, so the note gives way.
 */
export function Start(props: {
  page: PageOrg
  chosen: boolean
  admin: boolean
  /** The open repository menu, on a computer. */
  menu?: readonly MenuEntryData[]
}) {
  const { page } = props
  const ready = formWait(page) === undefined
  return (
    <div className={styles.start}>
      <Sparkles aria-hidden className={styles.icon} size={26} />
      <h2 className={styles.title}>Start a workspace</h2>
      <p className={styles.body}>
        {props.chosen
          ? 'Your first message creates it, on a new branch of the repository.'
          : props.admin
            ? `${chooseRepositoriesFirst(page.org.name)}.`
            : `An admin of ${page.org.name} chooses its repositories first.`}
      </p>
      {props.chosen ? (
        <RepositoryPicker menu={props.menu} repository={page.repository.name} />
      ) : props.admin ? (
        <ChooseRepositoriesButton />
      ) : null}
      {props.chosen && ready && page.built ? (
        <p className={styles.note}>
          Starts from the cloud computer of {page.org.name}, built {page.built}.
        </p>
      ) : null}
    </div>
  )
}
